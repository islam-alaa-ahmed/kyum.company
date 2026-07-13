// KYUM Phase 15.1 — Reports Engine
(function () {
  function dateOnly(value) {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function withinRange(value, from, to) {
    const date = dateOnly(value);
    if (!date) return false;
    const fromDate = dateOnly(from);
    const toDate = dateOnly(to);
    if (fromDate && date < fromDate) return false;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
      if (date > toDate) return false;
    }
    return true;
  }

  function repMatches(item, representative) {
    return !representative || item?.representative === representative;
  }

  function currency(value) {
    return Number(value || 0);
  }

  function followupState(item, today = new Date()) {
    if (item.completed) return "completed";
    const next = dateOnly(item.nextFollowupDate);
    if (!next) return "no_date";
    const current = new Date(today);
    current.setHours(0, 0, 0, 0);
    if (next < current) return "overdue";
    if (next.getTime() === current.getTime()) return "today";
    return "upcoming";
  }

  function monthKey(value) {
    const date = dateOnly(value);
    if (!date) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function lastMonths(count = 6) {
    const result = [];
    const current = new Date();
    current.setDate(1);
    for (let offset = count - 1; offset >= 0; offset -= 1) {
      const date = new Date(current.getFullYear(), current.getMonth() - offset, 1);
      result.push({
        key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        label: date.toLocaleDateString("ar-SA", { month: "short", year: "2-digit" })
      });
    }
    return result;
  }

  function build(data, filters = {}) {
    const customers = Array.isArray(data.customers) ? data.customers : [];
    const followups = Array.isArray(data.followups) ? data.followups : [];
    const quotations = Array.isArray(data.quotations) ? data.quotations : [];

    const filteredCustomers = customers.filter(item =>
      withinRange(item.createdAt || item.contactDate, filters.from, filters.to)
      && repMatches(item, filters.representative)
    );

    const filteredFollowups = followups.filter(item =>
      withinRange(item.contactDate || item.createdAt, filters.from, filters.to)
      && repMatches(item, filters.representative)
    );

    const filteredQuotations = quotations.filter(item =>
      withinRange(item.quotationDate || item.createdAt, filters.from, filters.to)
      && repMatches(item, filters.representative)
    );

    const customerIdsWithFollowup = new Set(filteredFollowups.map(item => item.customerId));
    const accepted = filteredQuotations.filter(item => item.status === "مقبول");
    const totalValue = filteredQuotations.reduce((sum, item) => sum + currency(item.amount), 0);
    const acceptedValue = accepted.reduce((sum, item) => sum + currency(item.amount), 0);

    const followupStates = filteredFollowups.reduce((acc, item) => {
      const key = followupState(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const quotationStatuses = filteredQuotations.reduce((acc, item) => {
      const key = item.status || "غير محدد";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const representatives = new Set([
      ...customers.map(item => item.representative).filter(Boolean),
      ...followups.map(item => item.representative).filter(Boolean),
      ...quotations.map(item => item.representative).filter(Boolean)
    ]);

    const representativePerformance = [...representatives].map(name => {
      const repCustomers = filteredCustomers.filter(item => item.representative === name);
      const repFollowups = filteredFollowups.filter(item => item.representative === name);
      const repQuotations = filteredQuotations.filter(item => item.representative === name);
      const repAccepted = repQuotations.filter(item => item.status === "مقبول");
      return {
        name,
        customers: repCustomers.length,
        followups: repFollowups.length,
        quotations: repQuotations.length,
        accepted: repAccepted.length,
        value: repQuotations.reduce((sum, item) => sum + currency(item.amount), 0),
        conversion: repQuotations.length
          ? (repAccepted.length / repQuotations.length) * 100
          : 0
      };
    }).sort((a, b) => b.value - a.value || b.accepted - a.accepted);

    const months = lastMonths(6).map(month => ({
      ...month,
      customers: filteredCustomers.filter(item =>
        monthKey(item.createdAt || item.contactDate) === month.key
      ).length,
      followups: filteredFollowups.filter(item =>
        monthKey(item.contactDate || item.createdAt) === month.key
      ).length,
      quotations: filteredQuotations.filter(item =>
        monthKey(item.quotationDate || item.createdAt) === month.key
      ).length
    }));

    return {
      filters,
      totals: {
        customers: filteredCustomers.length,
        newCustomers: filteredCustomers.length,
        followups: filteredFollowups.length,
        overdueFollowups: followupStates.overdue || 0,
        quotations: filteredQuotations.length,
        acceptedQuotations: accepted.length,
        quotationValue: totalValue,
        acceptedValue,
        conversionRate: filteredQuotations.length
          ? (accepted.length / filteredQuotations.length) * 100
          : 0,
        customersWithoutFollowup: filteredCustomers.filter(
          customer => !customerIdsWithFollowup.has(customer.id)
        ).length
      },
      funnel: [
        { label: "العملاء", value: filteredCustomers.length },
        { label: "تمت متابعتهم", value: customerIdsWithFollowup.size },
        { label: "عروض الأسعار", value: filteredQuotations.length },
        { label: "عروض مقبولة", value: accepted.length }
      ],
      quotationStatuses,
      followupStates,
      representativePerformance,
      months,
      generatedAt: new Date().toISOString()
    };
  }

  function toCsv(report) {
    const lines = [
      ["KYUM CRM Report", report.generatedAt],
      [],
      ["المؤشر", "القيمة"],
      ["إجمالي العملاء", report.totals.customers],
      ["إجمالي المتابعات", report.totals.followups],
      ["المتابعات المتأخرة", report.totals.overdueFollowups],
      ["إجمالي عروض الأسعار", report.totals.quotations],
      ["العروض المقبولة", report.totals.acceptedQuotations],
      ["قيمة العروض", report.totals.quotationValue],
      ["قيمة المقبول", report.totals.acceptedValue],
      ["نسبة التحويل", `${report.totals.conversionRate.toFixed(1)}%`],
      [],
      ["المندوب", "العملاء", "المتابعات", "العروض", "المقبولة", "القيمة", "نسبة التحويل"],
      ...report.representativePerformance.map(item => [
        item.name,
        item.customers,
        item.followups,
        item.quotations,
        item.accepted,
        item.value,
        `${item.conversion.toFixed(1)}%`
      ])
    ];

    return "\ufeff" + lines.map(row =>
      row.map(value => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")
    ).join("\n");
  }

  window.ReportsEngine = Object.freeze({ build, toCsv });
})();