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

  const HEADER_ALIASES = Object.freeze({
    customerNumber: ["رقم العميل", "customer_number", "customer number"],
    name: ["اسم العميل", "customer_name", "customer name"],
    phone: ["رقم الجوال", "الجوال", "phone", "mobile"],
    type: ["التصنيف", "نوع العميل", "customer_type", "customer type"],
    contactPersonName: ["اسم المسؤول", "المسؤول", "contact_person_name", "contact person"],
    city: ["المدينة", "city"],
    interests: ["مجالات الاهتمام", "مجال الاهتمام", "interests", "interest"],
    representative: ["مندوب المبيعات", "المندوب", "representative", "sales representative"],
    contactDate: ["تاريخ آخر تواصل", "last_contact_date", "contact date"],
    quotationNumber: ["رقم عرض السعر", "quotation_number", "quotation number"],
    noSaleReason: ["سبب عدم البيع", "no_sale_reason", "no sale reason"],
    notes: ["الملاحظات", "notes"]
  });

  function normalizeHeader(value) {
    return safeText(value).trim().toLowerCase().replace(/\s+/g, " ");
  }

  function resolveField(header) {
    const normalized = normalizeHeader(header);
    return Object.entries(HEADER_ALIASES).find(([, aliases]) =>
      aliases.some(alias => normalizeHeader(alias) === normalized)
    )?.[0] || null;
  }

  function normalizePhone(value) {
    let phone = safeText(value).trim().replace(/[^\d+]/g, "");
    if (phone.startsWith("+966")) phone = `0${phone.slice(4)}`;
    if (phone.startsWith("966")) phone = `0${phone.slice(3)}`;
    if (phone.startsWith("5") && phone.length === 9) phone = `0${phone}`;
    return phone.replace(/\D/g, "");
  }

  function splitInterests(value) {
    return safeText(value)
      .split(/[،,;|]/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function excelDateToIso(value) {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }
    if (typeof value === "number" && window.XLSX?.SSF?.parse_date_code) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed) {
        return [
          parsed.y,
          String(parsed.m).padStart(2, "0"),
          String(parsed.d).padStart(2, "0")
        ].join("-");
      }
    }
    const text = safeText(value).trim();
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? text : date.toISOString().slice(0, 10);
  }

  async function parseImportFile(file) {
    requireXlsx();
    if (!file) throw new Error("اختر ملف Excel أولًا.");

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      raw: false
    });

    const sheetName = workbook.SheetNames.find(name =>
      normalizeHeader(name) === "customers"
    ) || workbook.SheetNames[0];

    if (!sheetName) throw new Error("ملف Excel لا يحتوي على أوراق بيانات.");

    const matrix = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false
    });

    if (matrix.length < 2) {
      throw new Error("ملف Excel لا يحتوي على صفوف عملاء.");
    }

    const headers = matrix[0].map(resolveField);
    if (!headers.includes("name") || !headers.includes("phone")) {
      throw new Error("يجب أن يحتوي الملف على عمودي اسم العميل ورقم الجوال.");
    }

    return matrix.slice(1)
      .filter(row => row.some(cell => safeText(cell).trim()))
      .map((row, index) => {
        const record = {
          sourceRow: index + 2,
          customerNumber: "",
          name: "",
          phone: "",
          type: "",
          contactPersonName: "",
          city: "",
          interests: [],
          representative: "",
          contactDate: "",
          quotationNumber: "",
          noSaleReason: "",
          notes: ""
        };

        headers.forEach((field, columnIndex) => {
          if (!field) return;
          const value = row[columnIndex];

          if (field === "phone") record.phone = normalizePhone(value);
          else if (field === "interests") record.interests = splitInterests(value);
          else if (field === "contactDate") record.contactDate = excelDateToIso(value);
          else record[field] = safeText(value).trim();
        });

        return record;
      });
  }

  function buildImportPreview(rows, context) {
    const representativeMap = new Map(
      (context.representatives || []).map(item => [
        normalizeHeader(item.full_name || item.name),
        item
      ])
    );
    const interestMap = new Map(
      (context.interests || []).map(item => [normalizeHeader(item.name), item])
    );
    const reasonMap = new Map(
      (context.reasons || []).map(item => [normalizeHeader(item.name), item])
    );
    const existingMap = new Map(
      (context.customers || []).map(item => [normalizePhone(item.phone), item])
    );

    const phoneCounts = rows.reduce((map, row) => {
      if (row.phone) map.set(row.phone, (map.get(row.phone) || 0) + 1);
      return map;
    }, new Map());

    const previewRows = rows.map(row => {
      const errors = [];
      if (!row.name) errors.push("اسم العميل مطلوب");
      if (!/^05\d{8}$/.test(row.phone)) errors.push("رقم الجوال غير صالح");
      if (!["شركة", "فردي"].includes(row.type)) errors.push("التصنيف يجب أن يكون شركة أو فردي");
      if (row.type === "شركة" && !row.contactPersonName) {
        errors.push("اسم المسؤول مطلوب للشركة");
      }
      if (row.phone && phoneCounts.get(row.phone) > 1) {
        errors.push("رقم الجوال مكرر داخل الملف");
      }

      const representative = row.representative
        ? representativeMap.get(normalizeHeader(row.representative))
        : null;
      if (row.representative && !representative) errors.push("المندوب غير مسجل");

      const interestIds = [];
      for (const interestName of row.interests) {
        const interest = interestMap.get(normalizeHeader(interestName));
        if (!interest) errors.push(`مجال اهتمام غير مسجل: ${interestName}`);
        else interestIds.push(interest.id);
      }

      const reason = row.noSaleReason
        ? reasonMap.get(normalizeHeader(row.noSaleReason))
        : null;
      if (row.noSaleReason && !reason) errors.push("سبب عدم البيع غير مسجل");

      const existing = existingMap.get(row.phone) || null;

      return {
        ...row,
        normalizedPhone: row.phone,
        representativeId: representative?.id || null,
        interestIds,
        noSaleReasonId: reason?.id || null,
        existingCustomer: existing,
        status: errors.length ? "error" : (existing ? "existing" : "new"),
        errors
      };
    });

    return {
      rows: previewRows,
      summary: {
        total: previewRows.length,
        valid: previewRows.filter(row => !row.errors.length).length,
        errors: previewRows.filter(row => row.errors.length).length,
        newCustomers: previewRows.filter(row => row.status === "new").length,
        existingCustomers: previewRows.filter(row => row.status === "existing").length,
        duplicates: previewRows.filter(row =>
          row.errors.includes("رقم الجوال مكرر داخل الملف")
        ).length
      }
    };
  }

  window.CustomerExcelCenter = Object.freeze({
    exportCustomers,
    downloadTemplate,
    parseImportFile,
    buildImportPreview,
    normalizePhone,
    headers: [...EXPORT_HEADERS]
  });
})();