// KYUM Phase 15.2.1 — Executive KPIs & Sales Funnel Engine
(function () {
  function dateOnly(value) {
    if (!value) return null;
    const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function isoDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function withinRange(value, from, to) {
    const date = dateOnly(value);
    if (!date) return false;
    const fromDate = dateOnly(from);
    const toDate = dateOnly(to);
    if (fromDate && date < fromDate) return false;
    if (toDate && date > toDate) return false;
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

  function previousRange(from, to) {
    const fromDate = dateOnly(from);
    const toDate = dateOnly(to);
    if (!fromDate || !toDate) return { from: "", to: "" };

    const durationDays = Math.max(
      1,
      Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1
    );
    const previousTo = new Date(fromDate);
    previousTo.setDate(previousTo.getDate() - 1);
    const previousFrom = new Date(previousTo);
    previousFrom.setDate(previousFrom.getDate() - durationDays + 1);

    return {
      from: isoDate(previousFrom),
      to: isoDate(previousTo)
    };
  }

  function percentChange(current, previous, invert = false) {
    const currentValue = Number(current || 0);
    const previousValue = Number(previous || 0);
    if (previousValue === 0) {
      if (currentValue === 0) return 0;
      return invert ? -100 : 100;
    }

    const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    return invert ? -change : change;
  }

  function uniqueCustomerIds(rows) {
    return new Set(rows.map(item => item.customerId).filter(Boolean));
  }

  function customerIsQualified(customer) {
    return Boolean(
      customer?.interests?.length
      || customer?.interestIds?.length
      || customer?.representative
      || customer?.representativeId
    );
  }

  function summarize(data, filters) {
    const customers = data.customers.filter(item =>
      withinRange(item.createdAt || item.contactDate, filters.from, filters.to)
      && repMatches(item, filters.representative)
    );

    const followups = data.followups.filter(item =>
      withinRange(item.contactDate || item.createdAt, filters.from, filters.to)
      && repMatches(item, filters.representative)
    );

    const quotations = data.quotations.filter(item =>
      withinRange(item.quotationDate || item.createdAt, filters.from, filters.to)
      && repMatches(item, filters.representative)
    );

    const followupStates = followups.reduce((acc, item) => {
      const key = followupState(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const quotationStatuses = quotations.reduce((acc, item) => {
      const key = item.status || "غير محدد";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const accepted = quotations.filter(item => item.status === "مقبول");
    const negotiation = quotations.filter(item =>
      ["تم الإرسال", "تحت المراجعة", "تحت التجهيز"].includes(item.status)
    );

    const customerIdsWithFollowup = uniqueCustomerIds(followups);
    const customerIdsWithQuotation = uniqueCustomerIds(quotations);
    const negotiationCustomerIds = uniqueCustomerIds(negotiation);
    const wonCustomerIds = uniqueCustomerIds(accepted);
    const qualifiedCustomers = customers.filter(customerIsQualified);

    const quotationValue = quotations.reduce(
      (sum, item) => sum + currency(item.amount),
      0
    );
    const acceptedValue = accepted.reduce(
      (sum, item) => sum + currency(item.amount),
      0
    );

    const todayKey = isoDate(new Date());
    const todayFollowups = followups.filter(item =>
      String(item.nextFollowupDate || "").slice(0, 10) === todayKey
      && !item.completed
    ).length;

    return {
      customers,
      followups,
      quotations,
      accepted,
      negotiation,
      followupStates,
      quotationStatuses,
      customerIdsWithFollowup,
      customerIdsWithQuotation,
      negotiationCustomerIds,
      wonCustomerIds,
      qualifiedCustomers,
      quotationValue,
      acceptedValue,
      todayFollowups
    };
  }

  function build(data, filters = {}) {
    const source = {
      customers: Array.isArray(data.customers) ? data.customers : [],
      followups: Array.isArray(data.followups) ? data.followups : [],
      quotations: Array.isArray(data.quotations) ? data.quotations : []
    };

    const target = Math.max(0, Number(filters.target || 0));
    const current = summarize(source, filters);
    const previousFilters = {
      ...filters,
      ...previousRange(filters.from, filters.to)
    };
    const previous = summarize(source, previousFilters);

    const conversionRate = current.quotations.length
      ? (current.accepted.length / current.quotations.length) * 100
      : 0;

    const previousConversionRate = previous.quotations.length
      ? (previous.accepted.length / previous.quotations.length) * 100
      : 0;

    const targetAchievement = target
      ? Math.min(999, current.quotationValue / target * 100)
      : 0;

    const previousTargetAchievement = target
      ? Math.min(999, previous.quotationValue / target * 100)
      : 0;

    const funnel = [
      { key: "lead", label: "Lead", arabic: "العملاء المحتملون", value: current.customers.length },
      { key: "qualified", label: "Qualified", arabic: "عملاء مؤهلون", value: current.qualifiedCustomers.length },
      { key: "followup", label: "Follow-up", arabic: "تمت متابعتهم", value: current.customerIdsWithFollowup.size },
      { key: "quotation", label: "Quotation", arabic: "استلموا عرض سعر", value: current.customerIdsWithQuotation.size },
      { key: "negotiation", label: "Negotiation", arabic: "تحت التفاوض", value: current.negotiationCustomerIds.size },
      { key: "won", label: "Won", arabic: "صفقات ناجحة", value: current.wonCustomerIds.size }
    ].map((stage, index, stages) => {
      const previousStage = stages[index - 1];
      return {
        ...stage,
        stageConversion: previousStage?.value
          ? (stage.value / previousStage.value) * 100
          : index === 0 ? 100 : 0,
        totalConversion: current.customers.length
          ? (stage.value / current.customers.length) * 100
          : 0
      };
    });

    const representatives = new Set([
      ...source.customers.map(item => item.representative).filter(Boolean),
      ...source.followups.map(item => item.representative).filter(Boolean),
      ...source.quotations.map(item => item.representative).filter(Boolean)
    ]);

    const representativePerformance = [...representatives].map(name => {
      const repCustomers = current.customers.filter(item => item.representative === name);
      const repFollowups = current.followups.filter(item => item.representative === name);
      const repQuotations = current.quotations.filter(item => item.representative === name);
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
      customers: current.customers.filter(item =>
        monthKey(item.createdAt || item.contactDate) === month.key
      ).length,
      followups: current.followups.filter(item =>
        monthKey(item.contactDate || item.createdAt) === month.key
      ).length,
      quotations: current.quotations.filter(item =>
        monthKey(item.quotationDate || item.createdAt) === month.key
      ).length
    }));

    const customersWithoutFollowup = current.customers.filter(
      customer => !current.customerIdsWithFollowup.has(customer.id)
    ).length;
    const previousWithoutFollowup = previous.customers.filter(
      customer => !previous.customerIdsWithFollowup.has(customer.id)
    ).length;

    return {
      filters,
      previousFilters,
      totals: {
        customers: current.customers.length,
        newCustomers: current.customers.length,
        todayFollowups: current.todayFollowups,
        followups: current.followups.length,
        completedFollowups: current.followupStates.completed || 0,
        overdueFollowups: current.followupStates.overdue || 0,
        quotations: current.quotations.length,
        acceptedQuotations: current.accepted.length,
        quotationValue: current.quotationValue,
        acceptedValue: current.acceptedValue,
        conversionRate,
        target,
        targetAchievement,
        targetRemaining: Math.max(0, target - current.quotationValue),
        customersWithoutFollowup
      },
      previous: {
        customers: previous.customers.length,
        todayFollowups: previous.todayFollowups,
        followups: previous.followups.length,
        quotations: previous.quotations.length,
        quotationValue: previous.quotationValue,
        conversionRate: previousConversionRate,
        targetAchievement: previousTargetAchievement,
        customersWithoutFollowup: previousWithoutFollowup
      },
      deltas: {
        customers: percentChange(current.customers.length, previous.customers.length),
        todayFollowups: percentChange(current.todayFollowups, previous.todayFollowups),
        followups: percentChange(current.followups.length, previous.followups.length),
        quotations: percentChange(current.quotations.length, previous.quotations.length),
        quotationValue: percentChange(current.quotationValue, previous.quotationValue),
        conversionRate: percentChange(conversionRate, previousConversionRate),
        targetAchievement: percentChange(targetAchievement, previousTargetAchievement),
        customersWithoutFollowup: percentChange(
          customersWithoutFollowup,
          previousWithoutFollowup,
          true
        )
      },
      funnel,
      quotationStatuses: current.quotationStatuses,
      followupStates: current.followupStates,
      representativePerformance,
      months,
      generatedAt: new Date().toISOString()
    };
  }

  function toCsv(report) {
    const lines = [
      ["KYUM CRM Executive Report", report.generatedAt],
      ["Current Period", `${report.filters.from} to ${report.filters.to}`],
      ["Comparison Period", `${report.previousFilters.from} to ${report.previousFilters.to}`],
      [],
      ["المؤشر", "القيمة", "التغير"],
      ["إجمالي العملاء", report.totals.customers, `${report.deltas.customers.toFixed(1)}%`],
      ["متابعات اليوم", report.totals.todayFollowups, `${report.deltas.todayFollowups.toFixed(1)}%`],
      ["إجمالي المتابعات", report.totals.followups, `${report.deltas.followups.toFixed(1)}%`],
      ["إجمالي عروض الأسعار", report.totals.quotations, `${report.deltas.quotations.toFixed(1)}%`],
      ["قيمة العروض", report.totals.quotationValue, `${report.deltas.quotationValue.toFixed(1)}%`],
      ["نسبة التحويل", `${report.totals.conversionRate.toFixed(1)}%`, `${report.deltas.conversionRate.toFixed(1)}%`],
      ["تحقيق الهدف", `${report.totals.targetAchievement.toFixed(1)}%`, `${report.deltas.targetAchievement.toFixed(1)}%`],
      [],
      ["مرحلة المسار", "العدد", "تحويل المرحلة", "التحويل الكلي"],
      ...report.funnel.map(item => [
        `${item.label} — ${item.arabic}`,
        item.value,
        `${item.stageConversion.toFixed(1)}%`,
        `${item.totalConversion.toFixed(1)}%`
      ]),
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