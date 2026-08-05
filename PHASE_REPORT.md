# Phase M14.9.8.15 — Installation Day Lock & Smart Availability

- Day lock/unlock uses installationSchedule.edit.
- Locked days remain readable but reject all scheduling writes, including Super Admin until unlocked.
- Calendar shows glass blur and lock indicator.
- Assignment date list disables locked days.
- Technician time choices are disabled only for the selected technician/date and labeled محجوز.
- Backend trigger prevents locked-day writes and duplicate technician slots.
