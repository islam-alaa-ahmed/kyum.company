// KYUM Phase 17.4-C2 — Customer Excel Export & Template
(function () {
  const EXPORT_HEADERS = [
    "رقم العميل",
    "اسم العميل",
    "رقم الجوال",
    "التصنيف",
    "اسم المسؤول",
    "المدينة",
    "مجالات الاهتمام",
    "مندوب المبيعات",
    "تاريخ آخر تواصل",
    "رقم عرض السعر",
    "سبب عدم البيع",
    "الملاحظات"
  ];

  function requireXlsx() {
    if (!window.XLSX) {
      throw new Error("مكتبة Excel غير محملة.");
    }
  }

  function safeText(value) {
    return value === null || value === undefined ? "" : String(value);
  }

  function customerToRow(customer) {
    return {
      "رقم العميل": safeText(customer.customerNumber),
      "اسم العميل": safeText(customer.name),
      "رقم الجوال": safeText(customer.phone),
      "التصنيف": safeText(customer.type),
      "اسم المسؤول": safeText(customer.contactPersonName),
      "المدينة": safeText(customer.city),
      "مجالات الاهتمام": Array.isArray(customer.interests)
        ? customer.interests.join("، ")
        : safeText(customer.interests),
      "مندوب المبيعات": safeText(customer.representative),
      "تاريخ آخر تواصل": safeText(customer.contactDate),
      "رقم عرض السعر": safeText(customer.quotationNumber),
      "سبب عدم البيع": safeText(customer.noSaleReason),
      "الملاحظات": safeText(customer.notes)
    };
  }

  function applySheetLayout(sheet, rowCount) {
    sheet["!cols"] = [
      { wch: 16 },
      { wch: 28 },
      { wch: 18 },
      { wch: 12 },
      { wch: 24 },
      { wch: 18 },
      { wch: 34 },
      { wch: 24 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 },
      { wch: 38 }
    ];

    sheet["!autofilter"] = {
      ref: `A1:L${Math.max(1, rowCount + 1)}`
    };

    for (let row = 2; row <= rowCount + 1; row += 1) {
      const phoneCell = sheet[`C${row}`];
      if (phoneCell) {
        phoneCell.t = "s";
        phoneCell.z = "@";
        phoneCell.v = safeText(phoneCell.v);
      }
      const customerNumberCell = sheet[`A${row}`];
      if (customerNumberCell) {
        customerNumberCell.t = "s";
        customerNumberCell.z = "@";
      }
    }
  }

  function exportCustomers(customers, options = {}) {
    requireXlsx();

    const rows = (customers || []).map(customerToRow);
    const sheet = XLSX.utils.json_to_sheet(rows, {
      header: EXPORT_HEADERS,
      skipHeader: false
    });

    applySheetLayout(sheet, rows.length);

    const workbook = XLSX.utils.book_new();
    workbook.Props = {
      Title: "KYUM CRM Customers Export",
      Subject: options.filtered ? "Filtered customers" : "All customers",
      Author: "KYUM Company",
      CreatedDate: new Date()
    };

    XLSX.utils.book_append_sheet(workbook, sheet, "Customers");

    const timestamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replaceAll(":", "-");

    const scope = options.filtered ? "Filtered" : "All";
    XLSX.writeFile(workbook, `KYUM_Customers_${scope}_${timestamp}.xlsx`, {
      compression: true
    });

    return rows.length;
  }

  function downloadTemplate() {
    requireXlsx();

    const sampleRow = {
      "رقم العميل": "",
      "اسم العميل": "مثال: شركة كيوم للتجارة",
      "رقم الجوال": "0500000000",
      "التصنيف": "شركة",
      "اسم المسؤول": "اسم المسؤول داخل الشركة",
      "المدينة": "الرياض",
      "مجالات الاهتمام": "تبريد، أجهزة منزلية",
      "مندوب المبيعات": "اسم المندوب الموجود بالنظام",
      "تاريخ آخر تواصل": "2026-07-21",
      "رقم عرض السعر": "Q-2026-001",
      "سبب عدم البيع": "",
      "الملاحظات": "ملاحظات اختيارية"
    };

    const sheet = XLSX.utils.json_to_sheet([sampleRow], {
      header: EXPORT_HEADERS,
      skipHeader: false
    });

    applySheetLayout(sheet, 1);

    const instructions = [
      ["تعليمات نموذج استيراد العملاء"],
      ["اسم العميل ورقم الجوال حقول إلزامية."],
      ["رقم الجوال يجب أن يظل نصًا للحفاظ على الصفر الأول."],
      ["التصنيف يقبل فقط: شركة أو فردي."],
      ["اسم المسؤول مطلوب عند اختيار التصنيف شركة."],
      ["يمكن فصل مجالات الاهتمام بالفاصلة العربية أو الإنجليزية."],
      ["اسم المندوب ومجالات الاهتمام وسبب عدم البيع يجب أن تكون مسجلة مسبقًا في النظام."],
      ["لا تغيّر أسماء الأعمدة أو ترتيبها."]
    ];
    const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
    instructionsSheet["!cols"] = [{ wch: 95 }];

    const workbook = XLSX.utils.book_new();
    workbook.Props = {
      Title: "KYUM Customers Import Template",
      Subject: "Customer import template",
      Author: "KYUM Company",
      CreatedDate: new Date()
    };
    XLSX.utils.book_append_sheet(workbook, sheet, "Customers");
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, "Instructions");

    XLSX.writeFile(workbook, "KYUM_Customers_Import_Template.xlsx", {
      compression: true
    });
  }

  window.CustomerExcelCenter = Object.freeze({
    exportCustomers,
    downloadTemplate,
    headers: [...EXPORT_HEADERS]
  });
})();