/**
 * MORIOO CUSTOMER SERVICES SUITE
 * 1. Dịch vụ tư vấn nội thất
 * 2. Dịch vụ thiết kế và đặt đóng theo yêu cầu
 * 3. Dịch vụ vận chuyển và lắp đặt (Kèm tra cứu tiến độ thực hiện Live)
 * 4. Dịch vụ bảo trì và sửa chữa (Tải ảnh từ máy tính)
 * 5. Dịch vụ thiết kế không gian (Kích thước phòng & tải bản vẽ)
 */

import { db } from "./supabase-client.js?v=3.7";

let UPLOADED_MAINT_IMG = "";
let UPLOADED_SPACE_IMG = "";

/**
 * Nén ảnh tự động bằng HTML5 Canvas (~80KB - 150KB)
 */
function compressImageFile(file, maxWidth = 1000, quality = 0.75) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) {
                    h = Math.round((h * maxWidth) / w);
                    w = maxWidth;
                }
                const canvas = document.createElement("canvas");
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                const compressedBase64 = canvas.toDataURL("image/jpeg", quality);
                resolve(compressedBase64);
            };
            img.onerror = () => reject(new Error("Lỗi đọc file ảnh"));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error("Lỗi đọc file"));
        reader.readAsDataURL(file);
    });
}

/**
 * Mở Modal Dịch Vụ và chuyển đến Tab & Chế độ chỉ định
 */
window.openServiceModal = function(serviceType = "tu-van", initialMode = "customer") {
    const modal = document.getElementById("serviceModal");
    if (!modal) return;
    
    // Đảm bảo hiển thị hoàn toàn cả class active lẫn style inline
    modal.classList.add("active");
    modal.style.display = "flex";
    modal.style.opacity = "1";
    modal.style.visibility = "visible";
    modal.style.pointerEvents = "auto";
    document.body.style.overflow = "hidden";

    if (!modal.dataset.hasBackdropListener) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) window.closeServiceModal();
        });
        modal.dataset.hasBackdropListener = "true";
    }

    const typeToTab = {
        "tu-van": "svcTabConsult",
        "dat-dong": "svcTabCustom",
        "van-chuyen": "svcTabDelivery",
        "bao-tri": "svcTabMaint",
        "thiet-ke-khong-gian": "svcTabSpace"
    };

    const targetTab = typeToTab[serviceType] || "svcTabConsult";
    window.switchServiceModalTab(targetTab);

    // Kích hoạt chế độ Khách Hàng hoặc Nhân Viên Trả Lời
    window.switchServiceFormMode(serviceType, initialMode);
};

/**
 * Đóng Modal Dịch Vụ
 */
window.closeServiceModal = function() {
    const modal = document.getElementById("serviceModal");
    if (modal) {
        modal.classList.remove("active");
        modal.style.display = "none";
        modal.style.opacity = "0";
        modal.style.visibility = "hidden";
        modal.style.pointerEvents = "none";
        document.body.style.overflow = "";
    }
};

/**
 * Chuyển đổi giữa 5 Tabs trong Service Modal
 */
window.switchServiceModalTab = function(tabId) {
    document.querySelectorAll(".svc-tab-btn").forEach(btn => {
        const isActive = btn.dataset.tab === tabId;
        btn.classList.toggle("active", isActive);
        if (isActive) {
            btn.style.fontWeight = "700";
            btn.style.color = "#18181b";
            btn.style.borderBottom = "3px solid #7f1d1d";
        } else {
            btn.style.fontWeight = "600";
            btn.style.color = "#71717a";
            btn.style.borderBottom = "3px solid transparent";
        }
    });

    const tabToType = {
        "svcTabConsult": "tu-van",
        "svcTabCustom": "dat-dong",
        "svcTabDelivery": "van-chuyen",
        "svcTabMaint": "bao-tri",
        "svcTabSpace": "thiet-ke-khong-gian"
    };

    document.querySelectorAll(".svc-tab-pane").forEach(pane => {
        if (pane.id === tabId) {
            pane.style.display = "block";
            const svcType = tabToType[tabId] || "tu-van";
            window.populateStorefrontStaffRequestSelector(svcType);
        } else {
            pane.style.display = "none";
        }
    });
};

/**
 * Chuyển đổi giữa chế độ Khách Hàng Gửi Yêu Cầu và Nhân Viên Trả Lời
 */
window.switchServiceFormMode = function(serviceType, mode = "customer") {
    const cleanType = serviceType.replace(/-/g, "_");
    const paneCust = document.getElementById(`paneCustomer_${cleanType}`);
    const paneStaff = document.getElementById(`paneStaff_${cleanType}`);
    const btnCust = document.getElementById(`btnModeCustomer_${cleanType}`);
    const btnStaff = document.getElementById(`btnModeStaff_${cleanType}`);

    if (mode === "staff") {
        if (paneCust) paneCust.style.display = "none";
        if (paneStaff) paneStaff.style.display = "block";
        if (btnCust) {
            btnCust.classList.remove("active");
            btnCust.style.background = "transparent";
            btnCust.style.color = "#71717a";
            btnCust.style.fontWeight = "600";
        }
        if (btnStaff) {
            btnStaff.classList.add("active");
            btnStaff.style.background = "#fff";
            btnStaff.style.color = "#7f1d1d";
            btnStaff.style.fontWeight = "700";
        }
        window.populateStorefrontStaffRequestSelector(serviceType);
    } else {
        if (paneCust) paneCust.style.display = "block";
        if (paneStaff) paneStaff.style.display = "none";
        if (btnCust) {
            btnCust.classList.add("active");
            btnCust.style.background = "#fff";
            btnCust.style.color = "#7f1d1d";
            btnCust.style.fontWeight = "700";
        }
        if (btnStaff) {
            btnStaff.classList.remove("active");
            btnStaff.style.background = "transparent";
            btnStaff.style.color = "#71717a";
            btnStaff.style.fontWeight = "600";
        }
    }
};

/**
 * Nạp danh sách yêu cầu dịch vụ vào dropdown chọn để nhân viên trả lời
 */
window.populateStorefrontStaffRequestSelector = function(serviceType) {
    const cleanType = serviceType.replace(/-/g, "_");
    const select = document.getElementById(`sf_${cleanType}_codeSelect`);
    if (!select) return;

    let svcs = [];
    try {
        const raw = localStorage.getItem("morioo_service_requests");
        if (raw) svcs = JSON.parse(raw);
    } catch(e) {}

    const matching = svcs.filter(r => (r.service_type || "tu-van") === serviceType);

    let html = `<option value="">-- Chọn khách hàng đã gửi yêu cầu (${matching.length} yêu cầu) --</option>`;
    matching.forEach(r => {
        const hasReply = !!(r.staff_response || (r.details && r.details.staff_response));
        const badge = hasReply ? "💬 [Đã trả lời]" : "⏳ [Chờ trả lời]";
        html += `<option value="${r.code}">${badge} #${r.code} - ${r.customer_name} (${r.customer_phone || "SĐT"})</option>`;
    });

    if (matching.length === 0) {
        html += `<option value="DEMO">Mẫu demo: #DV-${cleanType.toUpperCase()}-001 - Khách hàng mẫu</option>`;
    }

    select.innerHTML = html;

    // Tự động chọn yêu cầu đầu tiên hoặc DEMO và điền sẵn dữ liệu mẫu cho nhân viên dễ thao tác
    if (matching.length > 0) {
        select.value = matching[0].code;
        window.onStorefrontSelectRequestToReply(serviceType, matching[0].code);
    } else {
        select.value = "DEMO";
        window.onStorefrontSelectRequestToReply(serviceType, "DEMO");
    }
};

/**
 * Tự động điền thông tin khi nhân viên chọn 1 yêu cầu để trả lời
 */
window.onStorefrontSelectRequestToReply = function(serviceType, code) {
    if (!code) return;
    const cleanType = serviceType.replace(/-/g, "_");

    let svcs = [];
    try {
        const raw = localStorage.getItem("morioo_service_requests");
        if (raw) svcs = JSON.parse(raw);
    } catch(e) {}

    const req = svcs.find(r => r.code === code) || {
        code: code,
        customer_name: "Khách hàng mẫu",
        customer_phone: "0912 345 678",
        service_type: serviceType,
        details: {}
    };

    const d = req.details || {};
    const sr = req.staff_response || d.staff_response || {};

    if (serviceType === "tu-van") {
        const statusEl = document.getElementById("sf_tu_van_status");
        if (statusEl) statusEl.value = sr.status || req.status || "consulting";
        const staffEl = document.getElementById("sf_tu_van_staff");
        if (staffEl) staffEl.value = sr.assigned_staff || req.assigned_staff || "KTS. Lê Văn Nhân Viên";
        const phoneEl = document.getElementById("sf_tu_van_phone");
        if (phoneEl) phoneEl.value = sr.staff_phone || "097 114 1140";
        const budgetEl = document.getElementById("sf_tu_van_budget");
        if (budgetEl) budgetEl.value = sr.suggested_budget || d.budget_range || "35.000.000 VNĐ";
        const styleEl = document.getElementById("sf_tu_van_styleRec");
        if (styleEl) styleEl.value = sr.style_recommendation || `Đề xuất phong cách ${d.style_preference || "Wabi-Sabi"} cho không gian ${d.room_type || "phòng khách"}`;
        const prodEl = document.getElementById("sf_tu_van_products");
        if (prodEl) prodEl.value = sr.suggested_products || "1. Sofa Vải Đay Khung Sồi; 2. Bàn Trà Noguchi Sồi; 3. Kệ Tivi Nan Gỗ 1m8";
        const appEl = document.getElementById("sf_tu_van_appointment");
        if (appEl) appEl.value = sr.appointment_time || "14h30 - Thứ 7 tuần này tại Showroom MORIOO";
        const msgEl = document.getElementById("sf_tu_van_message");
        if (msgEl) msgEl.value = sr.staff_message || req.staff_notes || `Chào bạn ${req.customer_name}, MORIOO đã lên phương án tư vấn hoàn chỉnh cho phòng ${d.room_type || ""}. Chúng tôi sẵn sàng hỗ trợ bạn!`;
    } else if (serviceType === "dat-dong") {
        const statusEl = document.getElementById("sf_dat_dong_status");
        if (statusEl) statusEl.value = sr.status || req.status || "consulting";
        const staffEl = document.getElementById("sf_dat_dong_staff");
        if (staffEl) staffEl.value = sr.assigned_staff || req.assigned_staff || "Nghệ nhân Đặng Văn Tuấn - Xưởng Mộc Thạnh";
        const phoneEl = document.getElementById("sf_dat_dong_phone");
        if (phoneEl) phoneEl.value = sr.staff_phone || "097 114 1140";
        const leadEl = document.getElementById("sf_dat_dong_leadTime");
        if (leadEl) leadEl.value = sr.lead_time || "12 ngày làm việc";
        const specsEl = document.getElementById("sf_dat_dong_specs");
        if (specsEl) specsEl.value = sr.production_specs || d.dimensions || "Dài 1800 x Rộng 850 x Cao 750 mm";
        const woodEl = document.getElementById("sf_dat_dong_woodFinish");
        if (woodEl) woodEl.value = sr.wood_finish || `${d.wood_material || "Gỗ Sồi Trắng Bắc Mỹ FAS"}, lau dầu Osmo Đức`;
        const totalEl = document.getElementById("sf_dat_dong_totalPrice");
        if (totalEl) totalEl.value = sr.total_price || "14.500.000 VNĐ";
        const depEl = document.getElementById("sf_dat_dong_deposit");
        if (depEl) depEl.value = sr.deposit_amount || "4.500.000 VNĐ (30%)";
        const remEl = document.getElementById("sf_dat_dong_remaining");
        if (remEl) remEl.value = sr.remaining_amount || "10.000.000 VNĐ";
        const drawEl = document.getElementById("sf_dat_dong_drawingUrl");
        if (drawEl) drawEl.value = sr.drawing_url || "";
        const msgEl = document.getElementById("sf_dat_dong_message");
        if (msgEl) msgEl.value = sr.staff_message || req.staff_notes || `Xưởng mộc MORIOO xác nhận bản vẽ chế tác ${d.product_category || "nội thất"}. Cam kết gỗ phôi sấy chuẩn và mộng ghép âm dương.`;
    } else if (serviceType === "van-chuyen") {
        const statusEl = document.getElementById("sf_van_chuyen_status");
        if (statusEl) statusEl.value = sr.status || req.status || "shipping";
        const driverEl = document.getElementById("sf_van_chuyen_driver");
        if (driverEl) driverEl.value = sr.driver_name || sr.assigned_staff || "Bác tài Nguyễn Văn Hùng - 0912.345.678";
        const plateEl = document.getElementById("sf_van_chuyen_plate");
        if (plateEl) plateEl.value = sr.license_plate || "29C-886.99 (Thùng kín)";
        const workerEl = document.getElementById("sf_van_chuyen_worker");
        if (workerEl) workerEl.value = sr.installation_worker || "Thợ mộc Trần Văn Tuấn";
        const feeEl = document.getElementById("sf_van_chuyen_fee");
        if (feeEl) feeEl.value = sr.delivery_fee || "Miễn phí 0 VNĐ";
        const slotEl = document.getElementById("sf_van_chuyen_timeSlot");
        if (slotEl) slotEl.value = sr.delivery_timeslot || `${req.preferred_date || "Hôm nay"} (09h00 - 11h30)`;
        const msgEl = document.getElementById("sf_van_chuyen_message");
        if (msgEl) msgEl.value = sr.staff_message || req.staff_notes || `Đội vận chuyển MORIOO đang xử lý giao hàng đến địa chỉ của bạn. Bác tài sẽ liên hệ trước 30 phút.`;
    } else if (serviceType === "bao-tri") {
        const statusEl = document.getElementById("sf_bao_tri_status");
        if (statusEl) statusEl.value = sr.status || req.status || "quoted";
        const staffEl = document.getElementById("sf_bao_tri_staff");
        if (staffEl) staffEl.value = sr.assigned_staff || req.assigned_staff || "KTV. Hoàng Đức Trọng - Đội Bảo Trì Gỗ";
        const phoneEl = document.getElementById("sf_bao_tri_phone");
        if (phoneEl) phoneEl.value = sr.staff_phone || "097 114 1140";
        const appEl = document.getElementById("sf_bao_tri_appointment");
        if (appEl) appEl.value = sr.appointment_time || req.preferred_date || "15h00 - Thứ 6 tuần này";
        const diagEl = document.getElementById("sf_bao_tri_diagnosis");
        if (diagEl) diagEl.value = sr.diagnosis || `Chẩn đoán: ${d.issue_type || "Hao mòn tự nhiên"}. Phương án: Xả nhám P400 và quét phục hồi 2 lớp dầu dưỡng Osmo Đức.`;
        const costEl = document.getElementById("sf_bao_tri_cost");
        if (costEl) costEl.value = sr.service_cost || "Miễn phí 100% (Bảo hành 36 tháng MORIOO)";
        const msgEl = document.getElementById("sf_bao_tri_message");
        if (msgEl) msgEl.value = sr.staff_message || req.staff_notes || `Kỹ thuật viên MORIOO đã tiếp nhận sự cố ${d.product_item || ""}. Chúng tôi sẽ đến xử lý hoàn thiện tại nhà.`;
    } else if (serviceType === "thiet-ke-khong-gian") {
        const statusEl = document.getElementById("sf_thiet_ke_khong_gian_status");
        if (statusEl) statusEl.value = sr.status || req.status || "quoted";
        const archEl = document.getElementById("sf_thiet_ke_khong_gian_architect");
        if (archEl) archEl.value = sr.assigned_staff || req.assigned_staff || "KTS. Trần Hải Đăng - Studio Không Gian Mộc";
        const phoneEl = document.getElementById("sf_thiet_ke_khong_gian_phone");
        if (phoneEl) phoneEl.value = sr.staff_phone || "097 114 1140";
        const leadEl = document.getElementById("sf_thiet_ke_khong_gian_leadTime");
        if (leadEl) leadEl.value = sr.lead_time || "15 - 20 ngày thi công hoàn thiện";
        const anaEl = document.getElementById("sf_thiet_ke_khong_gian_analysis");
        if (anaEl) anaEl.value = sr.design_analysis || `Giải pháp mặt bằng cho ${d.space_category || "không gian"}: Tối ưu luồng giao thông 1m2 rộng rãi, đón sáng tự nhiên qua hệ lam gỗ.`;
        const renEl = document.getElementById("sf_thiet_ke_khong_gian_renderUrl");
        if (renEl) renEl.value = sr.render_url || "";
        const budEl = document.getElementById("sf_thiet_ke_khong_gian_budget");
        if (budEl) budEl.value = sr.estimated_budget || d.budget_tier || "68.500.000 VNĐ";
        const msgEl = document.getElementById("sf_thiet_ke_khong_gian_message");
        if (msgEl) msgEl.value = sr.staff_message || req.staff_notes || `KTS đã hoàn thành phương án 2D/3D sơ bộ. Mời bạn xem chi tiết và liên hệ để tinh chỉnh phương án!`;
    }
};

/**
 * Xử lý khi nhân viên lưu và gửi phản hồi từ form trên storefront
 */
window.handleStorefrontStaffReplySubmit = async function(e, serviceType) {
    e.preventDefault();
    const cleanType = serviceType.replace(/-/g, "_");
    const codeSelect = document.getElementById(`sf_${cleanType}_codeSelect`);
    let selectedCode = codeSelect ? codeSelect.value : "";

    let svcs = [];
    try {
        const raw = localStorage.getItem("morioo_service_requests");
        if (raw) svcs = JSON.parse(raw);
    } catch(err) {}

    let req = svcs.find(r => r.code === selectedCode);
    if (!req) {
        // Tạo một mã yêu cầu mới nếu chưa chọn
        selectedCode = selectedCode || `DV-${cleanType.toUpperCase().slice(0, 2)}-${Math.floor(100000 + Math.random() * 900000)}`;
        req = {
            code: selectedCode,
            service_type: serviceType,
            customer_name: "Khách hàng MORIOO",
            customer_phone: "097 114 1140",
            address: "Địa chỉ nhận dịch vụ",
            created_at: new Date().toISOString(),
            details: {}
        };
        svcs.unshift(req);
    }

    let replyData = {
        service_type: serviceType,
        replied_at: new Date().toISOString()
    };
    let newStatus = "consulting";
    let assignedStaff = "Lê Văn Nhân Viên";
    let staffNotes = "";

    if (serviceType === "tu-van") {
        newStatus = document.getElementById("sf_tu_van_status")?.value || "consulting";
        assignedStaff = document.getElementById("sf_tu_van_staff")?.value || "Lê Văn Nhân Viên";
        const phone = document.getElementById("sf_tu_van_phone")?.value || "";
        const budget = document.getElementById("sf_tu_van_budget")?.value || "";
        const styleRec = document.getElementById("sf_tu_van_styleRec")?.value || "";
        const products = document.getElementById("sf_tu_van_products")?.value || "";
        const appointment = document.getElementById("sf_tu_van_appointment")?.value || "";
        const message = document.getElementById("sf_tu_van_message")?.value || "";
        staffNotes = message;

        replyData = {
            service_type: "tu-van",
            service_title: "Tư Vấn Nội Thất",
            status: newStatus,
            assigned_staff: assignedStaff,
            staff_phone: phone,
            suggested_budget: budget,
            style_recommendation: styleRec,
            suggested_products: products,
            appointment_time: appointment,
            staff_message: message,
            replied_at: new Date().toISOString()
        };
    } else if (serviceType === "dat-dong") {
        newStatus = document.getElementById("sf_dat_dong_status")?.value || "consulting";
        assignedStaff = document.getElementById("sf_dat_dong_staff")?.value || "Nghệ nhân xưởng mộc";
        const phone = document.getElementById("sf_dat_dong_phone")?.value || "";
        const leadTime = document.getElementById("sf_dat_dong_leadTime")?.value || "";
        const specs = document.getElementById("sf_dat_dong_specs")?.value || "";
        const woodFinish = document.getElementById("sf_dat_dong_woodFinish")?.value || "";
        const totalPrice = document.getElementById("sf_dat_dong_totalPrice")?.value || "";
        const deposit = document.getElementById("sf_dat_dong_deposit")?.value || "";
        const remaining = document.getElementById("sf_dat_dong_remaining")?.value || "";
        const drawingUrl = document.getElementById("sf_dat_dong_drawingUrl")?.value || "";
        const message = document.getElementById("sf_dat_dong_message")?.value || "";
        staffNotes = message;

        replyData = {
            service_type: "dat-dong",
            service_title: "Thiết Kế & May Đo Đặt Đóng",
            status: newStatus,
            assigned_staff: assignedStaff,
            staff_phone: phone,
            lead_time: leadTime,
            production_specs: specs,
            wood_finish: woodFinish,
            total_price: totalPrice,
            deposit_amount: deposit,
            remaining_amount: remaining,
            drawing_url: drawingUrl,
            staff_message: message,
            replied_at: new Date().toISOString()
        };
    } else if (serviceType === "van-chuyen") {
        newStatus = document.getElementById("sf_van_chuyen_status")?.value || "shipping";
        const driver = document.getElementById("sf_van_chuyen_driver")?.value || "";
        assignedStaff = driver;
        const plate = document.getElementById("sf_van_chuyen_plate")?.value || "";
        const worker = document.getElementById("sf_van_chuyen_worker")?.value || "";
        const fee = document.getElementById("sf_van_chuyen_fee")?.value || "";
        const timeSlot = document.getElementById("sf_van_chuyen_timeSlot")?.value || "";
        const message = document.getElementById("sf_van_chuyen_message")?.value || "";
        staffNotes = message;

        replyData = {
            service_type: "van-chuyen",
            service_title: "Vận Chuyển & Lắp Đặt",
            status: newStatus,
            assigned_staff: driver,
            driver_name: driver,
            license_plate: plate,
            installation_worker: worker,
            delivery_fee: fee,
            delivery_timeslot: timeSlot,
            staff_message: message,
            replied_at: new Date().toISOString()
        };
    } else if (serviceType === "bao-tri") {
        newStatus = document.getElementById("sf_bao_tri_status")?.value || "quoted";
        assignedStaff = document.getElementById("sf_bao_tri_staff")?.value || "KTV MORIOO";
        const phone = document.getElementById("sf_bao_tri_phone")?.value || "";
        const appointment = document.getElementById("sf_bao_tri_appointment")?.value || "";
        const diagnosis = document.getElementById("sf_bao_tri_diagnosis")?.value || "";
        const cost = document.getElementById("sf_bao_tri_cost")?.value || "";
        const message = document.getElementById("sf_bao_tri_message")?.value || "";
        staffNotes = message;

        replyData = {
            service_type: "bao-tri",
            service_title: "Bảo Trì & Sửa Chữa",
            status: newStatus,
            assigned_staff: assignedStaff,
            staff_phone: phone,
            appointment_time: appointment,
            diagnosis: diagnosis,
            service_cost: cost,
            staff_message: message,
            replied_at: new Date().toISOString()
        };
    } else if (serviceType === "thiet-ke-khong-gian") {
        newStatus = document.getElementById("sf_thiet_ke_khong_gian_status")?.value || "quoted";
        assignedStaff = document.getElementById("sf_thiet_ke_khong_gian_architect")?.value || "KTS MORIOO";
        const phone = document.getElementById("sf_thiet_ke_khong_gian_phone")?.value || "";
        const leadTime = document.getElementById("sf_thiet_ke_khong_gian_leadTime")?.value || "";
        const analysis = document.getElementById("sf_thiet_ke_khong_gian_analysis")?.value || "";
        const renderUrl = document.getElementById("sf_thiet_ke_khong_gian_renderUrl")?.value || "";
        const budget = document.getElementById("sf_thiet_ke_khong_gian_budget")?.value || "";
        const message = document.getElementById("sf_thiet_ke_khong_gian_message")?.value || "";
        staffNotes = message;

        replyData = {
            service_type: "thiet-ke-khong-gian",
            service_title: "Thiết Kế Không Gian",
            status: newStatus,
            assigned_staff: assignedStaff,
            staff_phone: phone,
            lead_time: leadTime,
            design_analysis: analysis,
            render_url: renderUrl,
            estimated_budget: budget,
            staff_message: message,
            replied_at: new Date().toISOString()
        };
    }

    req.status = newStatus;
    req.assigned_staff = assignedStaff;
    req.staff_notes = staffNotes;
    req.staff_response = replyData;
    req.details = req.details || {};
    req.details.staff_response = replyData;
    req.updated_at = new Date().toISOString();

    localStorage.setItem("morioo_service_requests", JSON.stringify(svcs));

    // Đồng bộ lên Supabase Cloud
    try {
        await db.restFetch(`service_requests?code=eq.${encodeURIComponent(req.code)}`, {
            method: "PATCH",
            body: JSON.stringify({
                status: req.status,
                assigned_staff: req.assigned_staff,
                staff_notes: req.staff_notes,
                details: req.details,
                updated_at: req.updated_at
            })
        });
    } catch(err) {}

    // Phát BroadcastChannel
    try {
        const bc = new BroadcastChannel("morioo_sync_channel");
        bc.postMessage({
            type: "SERVICE_REQUEST_STATUS_CHANGED",
            code: req.code,
            status: req.status,
            assigned_staff: req.assigned_staff,
            staff_notes: req.staff_notes,
            staff_response: replyData,
            timestamp: Date.now()
        });
        setTimeout(() => bc.close(), 1000);
    } catch(err) {}

    // Hiển thị thông báo
    alert(`🎉 Đã lưu và gửi phản hồi thành công cho yêu cầu #${req.code}!\n\nKhách hàng khi tra cứu mã #${req.code} sẽ đọc được toàn bộ báo giá, lịch hẹn và lời nhắn này.`);
    
    // Đổi lại danh sách
    window.populateStorefrontStaffRequestSelector(serviceType);
};

/**
 * Chuyển đổi giữa Đăng ký và Tra cứu tiến độ trong Tab Vận Chuyển
 */
window.toggleDeliverySubTab = function(mode) {
    const btnReg = document.getElementById("btnSubDeliveryRegister");
    const btnTrack = document.getElementById("btnSubDeliveryTracking");
    const paneReg = document.getElementById("subPaneDeliveryRegister");
    const paneTrack = document.getElementById("subPaneDeliveryTracking");

    if (mode === "register") {
        if (btnReg) { btnReg.style.background = "#7f1d1d"; btnReg.style.color = "#fff"; btnReg.style.border = "none"; }
        if (btnTrack) { btnTrack.style.background = "#f4f4f5"; btnTrack.style.color = "#52525b"; btnTrack.style.border = "1px solid #d4d4d8"; }
        if (paneReg) paneReg.style.display = "block";
        if (paneTrack) paneTrack.style.display = "none";
    } else {
        if (btnTrack) { btnTrack.style.background = "#7f1d1d"; btnTrack.style.color = "#fff"; btnTrack.style.border = "none"; }
        if (btnReg) { btnReg.style.background = "#f4f4f5"; btnReg.style.color = "#52525b"; btnReg.style.border = "1px solid #d4d4d8"; }
        if (paneReg) paneReg.style.display = "none";
        if (paneTrack) paneTrack.style.display = "block";
        setTimeout(() => {
            const input = document.getElementById("trackingQueryInput");
            if (input) input.focus();
        }, 100);
    }
};

/**
 * Xử lý tải ảnh bảo trì từ máy tính
 */
window.handleMaintFileSelected = async function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
        const base64 = await compressImageFile(file, 1000, 0.72);
        UPLOADED_MAINT_IMG = base64;
        const previewImg = document.getElementById("maintPreviewImg");
        const previewBox = document.getElementById("maintPreviewBox");
        const dropzone = document.getElementById("maintDropzone");
        if (previewImg && previewBox && dropzone) {
            previewImg.src = base64;
            previewBox.style.display = "block";
            dropzone.style.display = "none";
        }
    } catch (err) {
        alert("Không thể tải ảnh: " + err.message);
    }
};

window.removeMaintUploadedImage = function() {
    UPLOADED_MAINT_IMG = "";
    const fileInput = document.getElementById("maintFileInput");
    if (fileInput) fileInput.value = "";
    const previewBox = document.getElementById("maintPreviewBox");
    const dropzone = document.getElementById("maintDropzone");
    if (previewBox) previewBox.style.display = "none";
    if (dropzone) dropzone.style.display = "block";
};

/**
 * Xử lý tải bản vẽ thiết kế không gian từ máy tính
 */
window.handleSpaceFileSelected = async function(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
        const base64 = await compressImageFile(file, 1200, 0.75);
        UPLOADED_SPACE_IMG = base64;
        const previewImg = document.getElementById("spacePreviewImg");
        const previewBox = document.getElementById("spacePreviewBox");
        const dropzone = document.getElementById("spaceDropzone");
        if (previewImg && previewBox && dropzone) {
            previewImg.src = base64;
            previewBox.style.display = "block";
            dropzone.style.display = "none";
        }
    } catch (err) {
        alert("Không thể tải bản vẽ: " + err.message);
    }
};

window.removeSpaceUploadedImage = function() {
    UPLOADED_SPACE_IMG = "";
    const fileInput = document.getElementById("spaceFileInput");
    if (fileInput) fileInput.value = "";
    const previewBox = document.getElementById("spacePreviewBox");
    const dropzone = document.getElementById("spaceDropzone");
    if (previewBox) previewBox.style.display = "none";
    if (dropzone) dropzone.style.display = "block";
};

/**
 * Xử lý gửi Form dịch vụ
 */
window.handleServiceFormSubmit = async function(e, serviceType) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const details = {};
    for (let [k, v] of formData.entries()) {
        details[k] = v;
    }

    let attachedImage = "";
    if (serviceType === "bao-tri") {
        attachedImage = UPLOADED_MAINT_IMG;
    } else if (serviceType === "thiet-ke-khong-gian") {
        attachedImage = UPLOADED_SPACE_IMG;
    }

    const payload = {
        service_type: serviceType,
        customer_name: details.customer_name || "Khách hàng MORIOO",
        customer_phone: details.customer_phone || "",
        customer_email: details.customer_email || "",
        address: details.shipping_address || details.support_address || details.project_address || "",
        preferred_date: details.preferred_date || "",
        preferred_time: details.preferred_time || "",
        details: details,
        image_url: attachedImage
    };

    // Tạo yêu cầu dịch vụ vào DB & Local & Broadcast
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.innerText : "Gửi yêu cầu";
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "⏳ Đang ghi nhận...";
    }

    try {
        const result = await db.createServiceRequest(payload);
        const code = result.code;

        // Reset form & ảnh
        form.reset();
        window.removeMaintUploadedImage();
        window.removeSpaceUploadedImage();

        window.closeServiceModal();

        // Hiển thị modal thông báo thành công đẹp mắt
        showServiceSuccessPopup(serviceType, code, payload.customer_name, payload.customer_phone);
    } catch (err) {
        alert("Đã xảy ra lỗi khi gửi yêu cầu: " + err.message);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalText;
        }
    }
};

/**
 * Popup thông báo thành công cho khách hàng
 */
function showServiceSuccessPopup(serviceType, code, name, phone) {
    const titles = {
        "tu-van": "Tư Vấn Nội Thất MORIOO",
        "dat-dong": "Đặt Đóng Đồ Gỗ Theo Yêu Cầu",
        "van-chuyen": "Lịch Giao Hàng & Lắp Đặt Tại Nhà",
        "bao-tri": "Yêu Cầu Bảo Trì & Sửa Chữa Đồ Gỗ",
        "thiet-ke-khong-gian": "Hồ Sơ Thiết Kế Không Gian & Dự Toán"
    };

    const title = titles[serviceType] || "Dịch Vụ Khách Hàng";

    const popupHtml = `
        <div id="serviceSuccessModal" style="position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:10000; display:flex; align-items:center; justify-content:center; padding:20px;">
            <div style="background:#fff; border-radius:14px; max-width:480px; width:100%; padding:28px 24px; text-align:center; box-shadow:0 25px 50px rgba(0,0,0,0.3); animation:fadeInScale 0.25s ease;">
                <div style="width:64px; height:64px; background:#dcfce7; color:#15803d; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto 16px;">
                    ✓
                </div>
                <h3 style="font-size:20px; font-weight:800; color:#18181b; margin:0 0 8px;">Đã Tiếp Nhận Thành Công!</h3>
                <p style="font-size:13px; color:#52525b; line-height:1.6; margin:0 0 16px;">
                    Cảm ơn quý khách <strong>${name}</strong>. MORIOO đã tiếp nhận yêu cầu <strong>${title}</strong> của bạn.
                </p>

                <div style="background:#faf5ff; border:1px solid #e9d5ff; border-radius:8px; padding:12px 16px; margin-bottom:18px;">
                    <span style="font-size:11px; text-transform:uppercase; font-weight:700; color:#6b21a8; letter-spacing:0.5px;">Mã Tra Cứu Dịch Vụ Của Bạn:</span>
                    <div style="font-size:22px; font-weight:900; color:#7e22ce; font-family:monospace; margin-top:4px;">
                        ${code}
                    </div>
                    <div style="font-size:11.5px; color:#71717a; margin-top:4px;">Lưu lại mã này để tra cứu tiến độ thực hiện bất kỳ lúc nào.</div>
                </div>

                <div style="background:#f4f4f5; border-radius:8px; padding:12px; font-size:12px; color:#3f3f46; text-align:left; margin-bottom:20px; line-height:1.6;">
                    ⏱️ <strong>Cam kết thời gian xử lý:</strong><br>
                    • Nhân viên CSKH MORIOO sẽ gọi đến SĐT <strong>${phone}</strong> trong vòng <strong>30 - 60 phút</strong>.<br>
                    • Hotline hỗ trợ khẩn cấp 24/7: <a href="tel:1900255579" style="color:#b91c1c; font-weight:700;">1900 255 579</a>.
                </div>

                <div style="display:flex; gap:10px;">
                    <button type="button" onclick="navigator.clipboard.writeText('${code}'); alert('Đã sao chép mã ${code}!');" style="flex:1; padding:10px; border:1px solid #d4d4d8; background:#fff; border-radius:6px; font-size:12.5px; font-weight:700; cursor:pointer;">
                        📋 Sao Chép Mã
                    </button>
                    <button type="button" onclick="document.getElementById('serviceSuccessModal').remove();" class="btn-brand-primary" style="flex:1; padding:10px; border-radius:6px; font-size:12.5px; font-weight:700;">
                        Hoàn Tất
                    </button>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement("div");
    div.innerHTML = popupHtml;
    document.body.appendChild(div.firstElementChild);
}

/**
 * Tra cứu tiến độ thực hiện theo Mã đơn hàng hoặc Số điện thoại
 */
window.executeLiveTracking = async function() {
    const input = document.getElementById("trackingQueryInput");
    const container = document.getElementById("trackingResultArea");
    if (!input || !container) return;

    const query = input.value.trim();
    if (!query) {
        alert("Vui lòng nhập Mã đơn hàng hoặc Số điện thoại để tra cứu!");
        input.focus();
        return;
    }

    container.innerHTML = `
        <div style="text-align:center; padding:30px; color:#52525b;">
            <div style="display:inline-block; font-size:28px; animation:spin 1s linear infinite;">⏳</div>
            <div style="font-size:13px; font-weight:600; margin-top:8px;">Đang kết nối hệ thống tra cứu tiến độ...</div>
        </div>
    `;

    try {
        const result = await db.trackOrderOrService(query);

        if (!result) {
            container.innerHTML = `
                <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:10px; padding:24px; text-align:center;">
                    <span style="font-size:32px; display:block; margin-bottom:8px;">🔍</span>
                    <strong style="color:#be123c; font-size:15px;">Không tìm thấy thông tin đơn hàng hoặc dịch vụ phù hợp</strong>
                    <p style="font-size:12.5px; color:#4b5563; margin:8px 0 14px;">
                        Từ khóa tìm kiếm: <code>${query}</code>.<br>
                        Vui lòng kiểm tra lại Mã đơn hàng (VD: <code>MR-xxxxxx</code>) hoặc số điện thoại bạn đã dùng khi đặt hàng.
                    </p>
                    <a href="tel:1900255579" class="btn-brand-primary" style="display:inline-block; padding:8px 16px; border-radius:6px; font-size:12px; font-weight:700;">
                        📞 Gọi Hotline Hỗ Trợ 1900 255 579
                    </a>
                </div>
            `;
            return;
        }

        renderTrackingTimeline(container, result);
    } catch (err) {
        container.innerHTML = `
            <div style="color:#dc2626; padding:16px; text-align:center; font-size:13px;">
                Lỗi tra cứu: ${err.message}
            </div>
        `;
    }
};

/**
 * Hiển thị Timeline 5 bước tiến độ thực hiện
 */
function renderTrackingTimeline(container, result) {
    const isOrder = result.type === "order";
    const item = result.data;

    let code = isOrder ? (item.order_code || item.id) : (item.code || item.id);
    let name = item.customer_name || item.name || "Quý khách";
    let phone = item.customer_phone || item.phone || "";
    let address = item.shipping_address || item.address || "Tại cửa hàng";
    let status = (item.status || "pending").toLowerCase();
    let createdAt = item.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "Hôm nay";

    // 5 bước tiến độ thực hiện:
    // 1: Tiếp nhận yêu cầu
    // 2: Chuẩn bị hàng / Xuất kho
    // 3: Đang vận chuyển trên đường
    // 4: Đang lắp ráp tại nhà
    // 5: Hoàn tất nghiệm thu
    let currentStep = 1;
    let stepTitle = "Đã tiếp nhận yêu cầu";
    let badgeColor = "#b45309";
    let badgeBg = "#fef3c7";

    if (status === "confirmed" || status === "processing" || status === "quoted") {
        currentStep = 2;
        stepTitle = "Đã xác nhận & Đang chuẩn bị hàng tại kho";
        badgeColor = "#0284c7";
        badgeBg = "#e0f2fe";
    } else if (status === "shipping" || status === "in_progress") {
        currentStep = 3;
        stepTitle = "Xe tải MORIOO đang vận chuyển trên đường";
        badgeColor = "#7c3aed";
        badgeBg = "#ede9fe";
    } else if (status === "installing") {
        currentStep = 4;
        stepTitle = "Kỹ thuật viên đang lắp đặt hoàn thiện tại nhà";
        badgeColor = "#0d9488";
        badgeBg = "#ccfbf1";
    } else if (status === "completed") {
        currentStep = 5;
        stepTitle = "Đã bàn giao, nghiệm thu & hoàn tất";
        badgeColor = "#15803d";
        badgeBg = "#dcfce7";
    } else if (status === "cancelled") {
        currentStep = 0;
        stepTitle = "Đơn hàng / Dịch vụ đã hủy";
        badgeColor = "#dc2626";
        badgeBg = "#fee2e2";
    }

    const steps = [
        { num: 1, title: "Tiếp Nhận Yêu Cầu", desc: "Hệ thống ghi nhận & chuyên viên liên hệ xác nhận" },
        { num: 2, title: "Chuẩn Bị & Đóng Gói", desc: "Kiểm tra kỹ lưỡng mộng gỗ & bọc nệm chống trầy" },
        { num: 3, title: "Đang Vận Chuyển", desc: "Xe tải chuyên dụng vận chuyển đến địa chỉ của bạn" },
        { num: 4, title: "Lắp Đặt Tại Nhà", desc: "Thợ mộc hoàn thiện vị trí, cân chỉnh phụ kiện và lau dầu" },
        { num: 5, title: "Bàn Giao Nghiệm Thu", desc: "Khách hàng kiểm tra hài lòng & kích hoạt bảo hành 3 năm" }
    ];

    let stepsHtml = steps.map(s => {
        let isDone = s.num < currentStep;
        let isCurrent = s.num === currentStep;

        let circleStyle = "background:#f4f4f5; color:#a1a1aa; border:2px solid #d4d4d8;";
        let textStyle = "color:#71717a;";
        if (isDone) {
            circleStyle = "background:#15803d; color:#fff; border:2px solid #15803d;";
            textStyle = "color:#18181b;";
        } else if (isCurrent) {
            circleStyle = "background:#7f1d1d; color:#fff; border:2px solid #7f1d1d; box-shadow:0 0 0 4px rgba(127,29,29,0.2);";
            textStyle = "color:#7f1d1d; font-weight:800;";
        }

        return `
            <div style="flex:1; min-width:130px; text-align:center; position:relative; padding:0 6px;">
                <div style="width:36px; height:36px; border-radius:50%; margin:0 auto 8px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:13px; ${circleStyle}">
                    ${isDone ? "✓" : s.num}
                </div>
                <div style="font-size:12px; font-weight:700; ${textStyle} margin-bottom:3px;">
                    ${s.title}
                </div>
                <div style="font-size:10.5px; color:#71717a; line-height:1.4;">
                    ${s.desc}
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = `
        <div style="background:#fff; border:1px solid #e4e4e7; border-radius:12px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.04);">
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px; border-bottom:1px solid #f4f4f5; padding-bottom:14px; margin-bottom:18px;">
                <div>
                    <span style="font-size:11px; font-weight:700; text-transform:uppercase; color:#71717a; letter-spacing:0.5px;">${isOrder ? "Đơn Hàng Nội Thất" : "Yêu Cầu Dịch Vụ"}</span>
                    <h4 style="font-size:18px; font-weight:800; color:#18181b; margin:2px 0 0; font-family:monospace;">#${code}</h4>
                </div>
                <span style="padding:5px 14px; border-radius:20px; font-size:12px; font-weight:700; color:${badgeColor}; background:${badgeBg};">
                    ● ${stepTitle}
                </span>
            </div>

            <!-- Horizontal Step Indicator -->
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between; gap:10px; margin:24px 0 28px; position:relative;">
                ${stepsHtml}
            </div>

            <!-- Details Card -->
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; font-size:12.5px; line-height:1.7; display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px;">
                <div>
                    <span style="color:#64748b;">Khách hàng:</span> <strong style="color:#1e293b;">${name}</strong><br>
                    <span style="color:#64748b;">Số điện thoại:</span> <strong style="color:#1e293b;">${phone}</strong>
                </div>
                <div>
                    <span style="color:#64748b;">Địa chỉ giao/lắp:</span> <strong style="color:#1e293b;">${address}</strong><br>
                    <span style="color:#64748b;">Thời gian gửi:</span> <strong style="color:#1e293b;">${createdAt}</strong>
                </div>
                ${item.assigned_staff ? `
                <div>
                    <span style="color:#64748b;">Nhân viên tiếp nhận:</span> <strong style="color:#0284c7;">${item.assigned_staff}</strong><br>
                    <span style="color:#64748b;">Ghi chú kho/bưu tá:</span> <span style="color:#334155;">${item.staff_notes || "Đang xử lý đúng lộ trình"}</span>
                </div>
                ` : ""}
            </div>

            <!-- Phản hồi chi tiết từ nhân viên MORIOO (Từng gói dịch vụ riêng biệt) -->
            ${renderStaffResponseBoxHtml(item)}
        </div>
    `;
}

/**
 * Hiển thị khối phản hồi chi tiết từ nhân viên theo từng form riêng biệt của 5 dịch vụ
 */
function renderStaffResponseBoxHtml(item) {
    const sr = item.staff_response || (item.details && item.details.staff_response);
    if (!sr) return "";

    const type = item.service_type || sr.service_type || "tu-van";
    let specificHtml = "";

    if (type === "tu-van") {
        specificHtml = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:12px;">
                ${sr.style_recommendation ? `<div><span style="color:#64748b; font-size:11px;">Phong cách đề xuất:</span><br><strong style="color:#1e293b;">${sr.style_recommendation}</strong></div>` : ""}
                ${sr.suggested_budget ? `<div><span style="color:#64748b; font-size:11px;">Ước tính ngân sách:</span><br><strong style="color:#b45309; font-size:13.5px; font-family:monospace;">${sr.suggested_budget}</strong></div>` : ""}
                ${sr.appointment_time ? `<div><span style="color:#64748b; font-size:11px;">Lịch hẹn Showroom/Tư vấn:</span><br><strong style="color:#0284c7;">${sr.appointment_time}</strong></div>` : ""}
            </div>
            ${sr.suggested_products ? `
                <div style="background:#fff; border:1px dashed #cbd5e1; border-radius:6px; padding:10px 12px; margin-bottom:12px;">
                    <span style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase;">🛋️ Combo Sản Phẩm MORIOO Gợi Ý:</span>
                    <div style="margin-top:4px; color:#1e293b; white-space:pre-line; font-size:12px; line-height:1.5;">${sr.suggested_products}</div>
                </div>
            ` : ""}
        `;
    } else if (type === "dat-dong") {
        specificHtml = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:12px;">
                ${sr.production_specs ? `<div><span style="color:#64748b; font-size:11px;">Kích thước chốt xưởng:</span><br><strong style="color:#1e293b;">${sr.production_specs}</strong></div>` : ""}
                ${sr.wood_finish ? `<div><span style="color:#64748b; font-size:11px;">Chất liệu & Dầu lau:</span><br><strong style="color:#1e293b;">${sr.wood_finish}</strong></div>` : ""}
                ${sr.lead_time ? `<div><span style="color:#64748b; font-size:11px;">Tiến độ chế tác:</span><br><strong style="color:#0284c7;">${sr.lead_time}</strong></div>` : ""}
            </div>
            <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin-bottom:12px; display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px;">
                <div><span style="color:#64748b; font-size:11px;">Tổng chi phí xưởng:</span> <strong style="color:#b45309; font-size:14px; font-family:monospace;">${sr.total_price || "--"}</strong></div>
                <div><span style="color:#64748b; font-size:11px;">Cọc cam kết:</span> <strong style="color:#dc2626; font-size:13px; font-family:monospace;">${sr.deposit_amount || "--"}</strong></div>
                <div><span style="color:#64748b; font-size:11px;">Còn lại khi nhận hàng:</span> <strong style="color:#1e293b; font-size:13px; font-family:monospace;">${sr.remaining_amount || "--"}</strong></div>
            </div>
            ${sr.drawing_url ? `
                <div style="margin-bottom:12px;">
                    <a href="${sr.drawing_url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:700; text-decoration:none;">
                        📐 Xem Bản Vẽ Kỹ Thuật 2D/3D & Mộng Gỗ →
                    </a>
                </div>
            ` : ""}
        `;
    } else if (type === "van-chuyen") {
        specificHtml = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:12px;">
                <div><span style="color:#64748b; font-size:11px;">Bác tài phụ trách:</span><br><strong style="color:#1e293b;">${sr.driver_name || sr.assigned_staff || "Đội xe MORIOO"}</strong></div>
                ${sr.license_plate ? `<div><span style="color:#64748b; font-size:11px;">Biển số xe chuyên dụng:</span><br><strong style="color:#1e293b; font-family:monospace;">${sr.license_plate}</strong></div>` : ""}
                ${sr.installation_worker ? `<div><span style="color:#64748b; font-size:11px;">Thợ mộc đi cùng ráp:</span><br><strong style="color:#1e293b;">${sr.installation_worker}</strong></div>` : ""}
                ${sr.delivery_timeslot ? `<div><span style="color:#64748b; font-size:11px;">Khung giờ giao cam kết:</span><br><strong style="color:#7c3aed;">${sr.delivery_timeslot}</strong></div>` : ""}
                ${sr.delivery_fee ? `<div><span style="color:#64748b; font-size:11px;">Cước vận chuyển:</span><br><strong style="color:#15803d;">${sr.delivery_fee}</strong></div>` : ""}
            </div>
        `;
    } else if (type === "bao-tri") {
        specificHtml = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:12px;">
                <div><span style="color:#64748b; font-size:11px;">Kỹ thuật viên phụ trách:</span><br><strong style="color:#1e293b;">${sr.assigned_staff || "KTV MORIOO"}</strong></div>
                ${sr.appointment_time ? `<div><span style="color:#64748b; font-size:11px;">Lịch thợ đến nhà:</span><br><strong style="color:#0284c7;">${sr.appointment_time}</strong></div>` : ""}
                ${sr.service_cost ? `<div><span style="color:#64748b; font-size:11px;">Chi phí bảo dưỡng:</span><br><strong style="color:#15803d;">${sr.service_cost}</strong></div>` : ""}
                ${sr.materials ? `<div><span style="color:#64748b; font-size:11px;">Dầu dưỡng & vật tư:</span><br><strong style="color:#1e293b;">${sr.materials}</strong></div>` : ""}
            </div>
            ${sr.diagnosis ? `
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin-bottom:12px;">
                    <span style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase;">🛠️ Chẩn Đoán & Phương Án Kỹ Thuật:</span>
                    <div style="margin-top:4px; color:#1e293b; line-height:1.5; font-size:12px;">${sr.diagnosis}</div>
                </div>
            ` : ""}
        `;
    } else if (type === "thiet-ke-khong-gian") {
        specificHtml = `
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:12px;">
                <div><span style="color:#64748b; font-size:11px;">Kiến trúc sư chủ trì:</span><br><strong style="color:#1e293b;">${sr.assigned_staff || "KTS MORIOO"}</strong></div>
                ${sr.estimated_budget ? `<div><span style="color:#64748b; font-size:11px;">Dự toán tổng kinh phí:</span><br><strong style="color:#15803d; font-size:14px; font-family:monospace;">${sr.estimated_budget}</strong></div>` : ""}
                ${sr.lead_time ? `<div><span style="color:#64748b; font-size:11px;">Thời gian thi công:</span><br><strong style="color:#0284c7;">${sr.lead_time}</strong></div>` : ""}
            </div>
            ${sr.design_analysis ? `
                <div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:10px 14px; margin-bottom:12px;">
                    <span style="font-size:11px; font-weight:700; color:#475569; text-transform:uppercase;">📐 Đánh Giá Luồng Đi & Ánh Sáng:</span>
                    <div style="margin-top:4px; color:#1e293b; line-height:1.5; font-size:12px;">${sr.design_analysis}</div>
                </div>
            ` : ""}
            ${sr.render_url ? `
                <div style="margin-bottom:12px;">
                    <a href="${sr.render_url}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:6px; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0; padding:6px 14px; border-radius:6px; font-size:12px; font-weight:700; text-decoration:none;">
                        🎨 Xem Hồ Sơ Phối Cảnh 3D & Bản Vẽ →
                    </a>
                </div>
            ` : ""}
        `;
    }

    const staffPhone = sr.staff_phone || "097 114 1140";

    return `
        <div style="margin-top:18px; background:linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border:1.5px solid #86efac; border-radius:10px; padding:16px 18px; box-shadow:0 2px 8px rgba(34,197,94,0.08);">
            <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:8px; border-bottom:1px solid #bbf7d0; padding-bottom:10px; margin-bottom:12px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:20px;">🛎️</span>
                    <div>
                        <h5 style="margin:0; font-size:13.5px; font-weight:800; color:#166534;">
                            PHẢN HỒI CHÍNH THỨC TỪ ĐỘI NGŨ MORIOO
                        </h5>
                        <span style="font-size:11px; color:#15803d;">Cập nhật lúc: ${sr.replied_at ? new Date(sr.replied_at).toLocaleString("vi-VN") : "Hôm nay"}</span>
                    </div>
                </div>
                ${staffPhone ? `
                    <a href="tel:${staffPhone.replace(/\\s+/g, '')}" style="display:inline-flex; align-items:center; gap:6px; background:#166534; color:#fff; text-decoration:none; padding:5px 12px; border-radius:20px; font-size:11.5px; font-weight:700; box-shadow:0 2px 4px rgba(22,101,52,0.2);">
                        📞 Hotline: ${staffPhone}
                    </a>
                ` : ""}
            </div>

            ${specificHtml}

            ${sr.staff_message ? `
                <div style="background:#fff; border-left:4px solid #16a34a; border-radius:0 6px 6px 0; padding:10px 14px; margin-top:8px;">
                    <span style="font-size:11px; font-weight:700; color:#15803d; text-transform:uppercase;">💬 Lời Nhắn Gửi Quý Khách:</span>
                    <p style="margin:4px 0 0; color:#1e293b; font-size:12.5px; line-height:1.6; white-space:pre-line;">${sr.staff_message}</p>
                </div>
            ` : ""}
        </div>
    `;
}

// Lắng nghe BroadcastChannel để cập nhật thời gian thực
try {
    const syncChannel = new BroadcastChannel("morioo_sync_channel");
    syncChannel.onmessage = (e) => {
        if (e.data && e.data.type === "SERVICE_REQUEST_STATUS_CHANGED") {
            const input = document.getElementById("trackingQueryInput");
            if (input && input.value.trim().toUpperCase() === (e.data.code || "").toUpperCase()) {
                window.executeLiveTracking();
            }
        }
    };
} catch(e) {}
