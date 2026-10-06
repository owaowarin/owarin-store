# AI Usage Widget - portable desktop preview

แตก ZIP แล้วดับเบิลคลิก AIUsageWidget.exe เปิดได้ทันที ไม่ต้องเปิด PowerShell
ส่งไฟล์ EXE เพียงไฟล์เดียวให้คนอื่นได้ ข้อมูลตัวอย่างฝังอยู่ในโปรแกรม
สำหรับ Windows 10/11 ที่มี .NET Framework 4.8; ไม่ต้องติดตั้ง .NET SDK หรือ Node.js

- ลากที่ชื่อหรือพื้นที่การ์ดไปตำแหน่งใดก็ได้ รวมถึงจออื่น โปรแกรมจำตำแหน่งเมื่อปล่อยเมาส์และปิด
- ใช้ Ctrl + ปุ่มลูกศรเพื่อขยับทีละนิดได้ด้วย
- คลิกขวา: เปิด/ปิด Always on top, Reset position, Refresh และ Exit
- ปุ่ม Refresh หรือ F5 โหลดข้อมูลใหม่; ปุ่มลบย่อเข้า system tray; ปุ่มกากบาทปิดโปรแกรม
- ดับเบิลคลิกไอคอนใน system tray เพื่อเรียกหน้าต่างกลับมา
- หน้าต่างปรับความสูงตามข้อมูล หากจอเล็กให้ใช้ล้อเมาส์เลื่อน

**ยังเป็น DEMO:** ตัวเลขและเวลา reset เป็นตัวอย่าง ไม่ได้เชื่อมบัญชี Claude หรือ ChatGPT และไม่มีระบบ login/live usage ในรุ่นนี้
การ refresh จะอ่านไฟล์ข้อมูลเท่านั้น ไม่ได้เรียกบริการออนไลน์
หากวาง usage.json ไว้ข้าง EXE โปรแกรมจะอ่านไฟล์นั้นด้วย UTF-8 ทุก 60 วินาที; หากไม่มีจะใช้ตัวอย่างใน EXE
ควรคง demo: true จนกว่าจะมีตัวเชื่อมข้อมูลจริง

ตำแหน่งเก็บแยกต่อเครื่องที่ %LOCALAPPDATA%\AIUsageWidget\window.json โดยไม่ติดไปใน ZIP
โปรแกรมยังไม่ได้เซ็น digital signature; รุ่นนี้ไม่ได้ทดสอบบนเครื่องอื่นหรือ Windows ARM

สำหรับผู้พัฒนา: build.ps1 คอมไพล์ด้วย .NET Framework compiler ที่มีใน Windows และสร้าง ZIP
ตรวจสอบด้วย AIUsageWidget.exe --self-test <absolute-report-path> จะสร้างรายงานและภาพ render .png
AIUsageWidget.ps1 และ run-widget.cmd เป็นตัวเปิด EXE เพื่อรองรับทางเข้าเดิมเท่านั้น
