/**
 * MORIOO CUSTOMER SERVICES SUITE
 * 1. Dịch vụ tư vấn nội thất
 * 2. Dịch vụ thiết kế và đặt đóng theo yêu cầu
 * 3. Dịch vụ vận chuyển và lắp đặt (Kèm tra cứu tiến độ thực hiện Live)
 * 4. Dịch vụ bảo trì và sửa chữa (Tải ảnh từ máy tính)
 * 5. Dịch vụ thiết kế không gian (Kích thước phòng & tải bản vẽ)
 */

import { db } from "./supabase-client.js";

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
 * Mở Modal Dịch Vụ và chuyển đến Tab chỉ định
 */
window.openServiceModal = function(serviceType = "tu-van") {
    const modal = document.getElementById("serviceModal");
    if (!modal) return;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    const typeToTab = {
        "tu-van": "svcTabConsult",
        "dat-dong": "svcTabCustom",
        "van-chuyen": "svcTabDelivery",
        "bao-tri": "svcTabMaint",
        "thiet-ke-khong-gian": "svcTabSpace"
    };

    const targetTab = typeToTab[serviceType] || "svcTabConsult";
    window.switchServiceModalTab(targetTab);
};

/**
 * Đóng Modal Dịch Vụ
 */
window.closeServiceModal = function() {
    const modal = document.getElementById("serviceModal");
    if (modal) {
        modal.style.display = "none";
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

    document.querySelectorAll(".svc-tab-pane").forEach(pane => {
        if (pane.id === tabId) {
            pane.style.display = "block";
        } else {
            pane.style.display = "none";
        }
    });
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
