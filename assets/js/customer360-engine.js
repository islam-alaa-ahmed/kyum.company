// KYUM Phase 15.3.1 — Customer 360 Foundation Engine
(function () {
  function asDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function amount(value) {
    return Number(value || 0);
  }

  function daysSince(value) {
    const date = asDate(value);
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((today.getTime() - date.getTime()) / 86400000));
  }

  function latestByDate(rows, fields) {
    return [...rows].sort((a, b) => {
      const dateA = fields.map(field => asDate(a?.[field])).find(Boolean);
      const dateB = fields.map(field => asDate(b?.[field])).find(Boolean);
      return Number(dateB || 0) - Number(dateA || 0);
    })[0] || null;
  }

  function followupState(item) {
    if (item?.completed) return "completed";
    const next = asDate(item?.nextFollowupDate);
    if (!next) return "no_date";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    next.setHours(0, 0, 0, 0);

    if (next < today) return "overdue";
    if (next.getTime() === today.getTime()) return "today";
    return "upcoming";
  }

  function build(customer, followups, quotations) {
    const customerFollowups = (followups || [])
      .filter(item => item.customerId === customer.id)
      .sort((a, b) => Number(asDate(b.contactDate || b.createdAt)) - Number(asDate(a.contactDate || a.createdAt)));

    const customerQuotations = (quotations || [])
      .filter(item => item.customerId === customer.id)
      .sort((a, b) => Number(asDate(b.quotationDate || b.createdAt)) - Number(asDate(a.quotationDate || a.createdAt)));

    const accepted = customerQuotations.filter(item => item.status === "مقبول");
    const open = customerQuotations.filter(item =>
      !["مقبول", "مرفوض", "ملغي"].includes(item.status)
    );

    const followupStates = customerFollowups.reduce((acc, item) => {
      const state = followupState(item);
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {});

    const latestFollowup = latestByDate(customerFollowups, ["contactDate", "createdAt"]);
    const latestQuotation = latestByDate(customerQuotations, ["quotationDate", "createdAt"]);
    const lastContactDate = latestFollowup?.contactDate
      || customer.contactDate
      || customer.lastContactDate
      || null;

    const inactivityDays = daysSince(lastContactDate);
    const hasOverdue = Boolean(followupStates.overdue);
    let status = {
      key: "active",
      label: "نشط",
      detail: "التواصل مع العميل ضمن النطاق الطبيعي."
    };

    if (hasOverdue) {
      status = {
        key: "overdue",
        label: "متابعة متأخرة",
        detail: "يوجد موعد متابعة تجاوز تاريخه."
      };
    } else if (!customerFollowups.length) {
      status = {
        key: "needs_followup",
        label: "يحتاج متابعة",
        detail: "لم تتم إضافة أي متابعة للعميل."
      };
    } else if (inactivityDays === null || inactivityDays > 30) {
      status = {
        key: "inactive",
        label: "غير نشط",
        detail: inactivityDays === null
          ? "لا يوجد تاريخ تواصل واضح."
          : `مر ${inactivityDays} يومًا منذ آخر تواصل.`
      };
    } else if (followupStates.today) {
      status = {
        key: "today",
        label: "متابعة اليوم",
        detail: "يوجد موعد متابعة مستحق اليوم."
      };
    }

    const totalQuotationValue = customerQuotations.reduce(
      (sum, item) => sum + amount(item.amount),
      0
    );
    const acceptedValue = accepted.reduce(
      (sum, item) => sum + amount(item.amount),
      0
    );

    return {
      customer,
      followups: customerFollowups,
      quotations: customerQuotations,
      latestFollowup,
      latestQuotation,
      lastContactDate,
      inactivityDays,
      status,
      followupStates,
      totals: {
        followups: customerFollowups.length,
        overdueFollowups: followupStates.overdue || 0,
        upcomingFollowups: (followupStates.today || 0) + (followupStates.upcoming || 0),
        completedFollowups: followupStates.completed || 0,
        quotations: customerQuotations.length,
        acceptedQuotations: accepted.length,
        openQuotations: open.length,
        totalQuotationValue,
        acceptedValue,
        conversionRate: customerQuotations.length
          ? (accepted.length / customerQuotations.length) * 100
          : 0
      }
    };
  }

  window.Customer360Engine = Object.freeze({ build });
})();