# Session52 — Create order diagnosis

Session52: Create order toastในภาพเกิดจาก Shipping Subsidyว่าง; exact deployed v41 Index validation reject missing before orders.create และรับ0. กรอก0เฉพาะเมื่อร้านไม่ช่วยค่าส่ง หรือจำนวนจริงที่ร้านออก แล้วกด Create order; ราคา270/CustomerShipping50ในภาพไม่ต้องย้ายไปช่องsubsidy. ไม่มี source/deploy/data write หรือ order API call; ยังไม่ได้ตรวจผลหลังเจ้าของกรอกค่า.

Fresh local v41 Index hash matches authoritative native release snapshot. Actual w1StrictMoney blank:null,0:0,50:50 PASS; confirmSold returns from validation before orders.create on blank subsidy. Screenshot shows the same toast and empty subsidy field. Runtime/deploy/production data unchanged; no fresh Google source/export or successfully created order claim. Docs/readback complete; next owner entry and response check.
