# Phase M14.9.1.6 — Execution Timeline & Active Stage Alignment Hotfix

## Root Cause
كان تركيب HTML الخاص بالـTimeline يستخدم wrapper بعرض عمود واحد لكل مرحلة مع connector داخله، بينما CSS الأساسي يفترض خمس خلايا فقط. نتج عن ذلك التفاف العناصر واختلاف خطوط الأساس وانفصال بطاقة المرحلة الحالية عن الدائرة النشطة.

## Scope
- إعادة بناء عرض الخطوات كعناصر مرحلة وموصلات مستقلة على Grid ثابت.
- تثبيت أحجام الدوائر والعناوين والأوقات.
- عرض مدة الانتقال داخل الموصل بين المرحلتين.
- إضافة مؤشر بصري يربط بطاقة المرحلة الحالية بالدائرة النشطة.
- توحيد زر الإجراء مع المرحلة الحالية.

## Files Modified
- assets/css/installation-execution.css
- assets/js/installation-execution.js
- assets/js/pwa.js
- index.html
- service-worker.js
- package.json
- version.json

## Version
- Version: 18.39.6
- Build: 183906
- Cache Token: kyum-crm-pwa-18-39-6-m14-9-1-6-timeline-stage-alignment

## Regression
لم يتم تعديل RPC أو SQL أو RLS أو انتقالات الحالات أو Team Scope أو سجل التنفيذ.
