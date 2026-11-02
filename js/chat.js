/**
 * MORIOO Floating Customer Service Chatbox Widget
 * Includes real-time database-backed consultation, Google Gemini AI advisor (gemini-3.8-flash),
 * multi-candidate server auto-reconnection, instant client-side fallback, and persistent chat sessions.
 */

(function () {
  let sessionId = localStorage.getItem('morioo_chat_session_id') || localStorage.getItem('moc_chat_session_id');
  if (!sessionId) {
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    sessionId = `CHAT-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;
    localStorage.setItem('morioo_chat_session_id', sessionId);
  }

  let chatHistory = [];
  let isOpen = false;
  let isSending = false;
  let activeApiBase = localStorage.getItem('morioo_api_base') || '';

  // Priority API candidates to survive any port, live-server, or file:// scenario
  function getCandidateUrls(endpoint) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const candidates = [];
    
    // 1. If we already found a working base in this browser
    if (activeApiBase) {
      candidates.push(`${activeApiBase}${cleanEndpoint}`);
    }
    
    // 2. Relative path (standard when running on Flask server)
    if (window.location.protocol.startsWith('http')) {
      candidates.push(cleanEndpoint);
      if (window.location.origin) {
        candidates.push(`${window.location.origin}${cleanEndpoint}`);
      }
    }
    
    // 3. Common local development ports
    candidates.push(`http://localhost:5000${cleanEndpoint}`);
    candidates.push(`http://127.0.0.1:5000${cleanEndpoint}`);
    
    // Deduplicate while preserving order
    return Array.from(new Set(candidates));
  }

  async function resilientFetch(endpoint, options = {}) {
    const candidates = getCandidateUrls(endpoint);
    let lastError = null;

    for (const url of candidates) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        
        const fetchOptions = {
          ...options,
          signal: controller.signal,
          mode: 'cors'
        };

        const res = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        if (res.ok || res.status < 500) {
          // If this URL succeeded, save the base domain for speed next time
          try {
            const parsedUrl = new URL(url, window.location.href);
            if (parsedUrl.origin && parsedUrl.origin.startsWith('http') && parsedUrl.origin !== window.location.origin) {
              activeApiBase = parsedUrl.origin;
              localStorage.setItem('morioo_api_base', activeApiBase);
            }
          } catch (_) {}
          return res;
        }
      } catch (err) {
        lastError = err;
        // Continue to try next candidate
      }
    }
    throw lastError || new Error('All API candidates unreachable');
  }

  function formatChatText(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
    escaped = escaped.replace(/•/g, '&bull;');
    return escaped.replace(/\n/g, '<br>');
  }

  // Client-side smart knowledge base fallback when completely offline / server not started
  function getClientFallbackReply(query) {
    const q = (query || '').toLowerCase().trim();

    if (q.includes('bàn') || q.includes('ghế')) {
      return `🪑 **Các mẫu Bàn & Ghế gỗ sồi tự nhiên MORIOO được ưa chuộng nhất:**\n\n` +
        `• **Bộ bàn ghế ăn Lunar Oval:** Gỗ sồi trắng nhập khẩu Bắc Mỹ vân núi tuyệt đẹp — **12.800.000₫**\n` +
        `• **Ghế ăn Wishbone đan mây tự nhiên:** Tinh xảo, tựa lưng công thái học — **2.450.000₫**\n` +
        `• **Bàn trà Noguchi mặt kính chân sồi uốn:** Thiết kế hữu cơ Zen — **4.500.000₫**\n` +
        `• **Ghế thư giãn Eames Lounge da bò thật:** Đệm cao su non êm ái — **16.500.000₫**\n\n` +
        `👉 Quý khách có thể xem ảnh thật trên website hoặc để lại SĐT để chuyên viên MORIOO gửi catalogue nhé!`;
    }

    if (q.includes('tủ') || q.includes('kệ')) {
      return `🚪 **Bộ sưu tập Tủ & Kệ gỗ sồi tự nhiên MORIOO:**\n\n` +
        `• **Kệ TV Minimalist 3 ngăn kéo (1m8 - 2m):** Chịu lực tốt, ngăn dây thông minh — **6.200.000₫**\n` +
        `• **Tủ giày thông minh khử mùi:** Cánh nan thông thoáng, sức chứa 25-30 đôi — **4.800.000₫**\n` +
        `• **Tủ quần áo 3 cánh Osaka Wabi-Sabi:** Gỗ sồi Nga mộng chốt mộc — **18.500.000₫**\n\n` +
        `Quý khách muốn xem kích thước chi tiết nào ạ?`;
    }

    if (q.includes('giường') || q.includes('tatami')) {
      return `🛏️ **Giường ngủ Tatami phong cách Nhật Bản MORIOO:**\n\n` +
        `• **Giường sồi Tatami ngăn kéo ẩn (1m6 / 1m8):** — **14.500.000₫**\n` +
        `• Sử dụng 100% gỗ sồi tự nhiên sấy tiêu chuẩn FAS, khử ẩm chống cong vênh mối mọt.\n` +
        `• Sơn phủ dầu thực vật Bio an toàn tuyệt đối cho trẻ nhỏ và sức khỏe gia đình.`;
    }

    if (q.includes('bảo hành') || q.includes('đổi trả')) {
      return `🛡️ **Chính sách bảo hành & Hậu mãi MORIOO:**\n\n` +
        `• **Bảo hành kết cấu gỗ:** 36 tháng (3 năm) tận nhà miễn phí.\n` +
        `• **Bảo trì trọn đời:** Định kỳ hỗ trợ đánh bóng, lau dầu dưỡng gỗ tự nhiên.\n` +
        `• **Đổi mới 1 - 1:** Trong vòng 30 ngày nếu phát hiện lỗi kỹ thuật từ nhà sản xuất.`;
    }

    if (q.includes('giao hàng') || q.includes('vận chuyển') || q.includes('phí')) {
      return `🚚 **Chính sách Vận chuyển & Lắp đặt MORIOO:**\n\n` +
        `• **Miễn phí 100%:** Giao hàng và lắp đặt tận nhà tại khu vực nội thành TP.HCM và Hà Nội cho đơn hàng từ 5.000.000₫.\n` +
        `• **Đội xe tải chuyên dụng:** Bọc nệm mút 3 lớp, đội ngũ thợ lành nghề lắp ráp chỉn chu, dọn sạch rác trước khi bàn giao.\n` +
        `• **Tỉnh thành khác:** Hỗ trợ 50% chi phí vận chuyển liên tỉnh an toàn.`;
    }

    if (q.includes('showroom') || q.includes('địa chỉ') || q.includes('cửa hàng')) {
      return `📍 **Hệ thống Showroom trải nghiệm nội thất MORIOO:**\n\n` +
        `• **Showroom TP.HCM:** 88 Đường Song Hành, Thảo Điền, TP. Thủ Đức, TP.HCM\n` +
        `• **Showroom Hà Nội:** 45 Phố Huế, Q. Hoàn Kiếm, Hà Nội\n` +
        `• **Giờ mở cửa:** 08:30 - 21:00 (Tất cả các ngày trong tuần)\n` +
        `• **Hotline / Zalo tư vấn 24/7:** 0988 777 666`;
    }

    if (q.startsWith('mor-') || q.includes('tra cứu')) {
      return `📦 **Tra cứu đơn hàng MORIOO:**\n\nDạ Quý khách vui lòng cung cấp đúng mã đơn hàng (ví dụ: MOR-123456) hoặc Số Điện Thoại đặt hàng để em tra cứu tiến độ ngay ạ!`;
    }

    return `Dạ MORIOO xin chào Quý khách! 👋\n\n` +
      `Em là **Tư vấn viên MORIOO AI** chuyên về nội thất gỗ sồi tự nhiên. Em có thể tư vấn sản phẩm, báo giá may đo, tiến độ giao hàng hoặc chính sách bảo hành.\n\n` +
      `Quý khách đang quan tâm đến không gian nào (Phòng khách, Phòng ăn, Phòng ngủ) hay cần xem mẫu sản phẩm cụ thể ạ?`;
  }

  function injectChatWidget() {
    if (document.getElementById('moriooChatWidgetContainer') || document.getElementById('mocChatWidgetContainer')) return;

    const container = document.createElement('div');
    container.id = 'moriooChatWidgetContainer';
    container.innerHTML = `
      <!-- FLOATING TRIGGER BUTTON -->
      <button 
        id="moriooChatTriggerBtn" 
        onclick="toggleMoriooChat()" 
        style="position:fixed; bottom:24px; right:24px; z-index:9999; background:linear-gradient(135deg, #c94a29 0%, #a2381b 100%); color:#fff; font-family:'Be Vietnam Pro',sans-serif; font-size:13px; font-weight:600; padding:12px 20px; border-radius:50px; box-shadow:0 10px 25px rgba(201,74,41,0.35); display:flex; align-items:center; gap:10px; border:none; cursor:pointer; transition:transform 0.2s, box-shadow 0.2s;"
        title="Tư vấn trực tuyến MORIOO AI"
      >
        <span style="position:relative; display:inline-block; width:10px; height:10px;">
          <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:#22c55e; opacity:0.75; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <span style="position:relative; display:inline-block; width:10px; height:10px; border-radius:50%; background:#16a34a;"></span>
        </span>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>Tư vấn MORIOO AI</span>
        <span id="moriooChatBadge" style="display:none; background:#ef4444; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; margin-left:-4px;">1</span>
      </button>

      <!-- CHAT WINDOW MODAL -->
      <div 
        id="moriooChatWindow" 
        style="position:fixed; bottom:85px; right:24px; z-index:9999; width:390px; max-width:calc(100vw - 32px); height:550px; max-height:82vh; background:#fff; border-radius:18px; box-shadow:0 20px 40px rgba(0,0,0,0.18); border:1px solid #ebe6df; display:flex; flex-direction:column; overflow:hidden; transition:all 0.25s ease; transform:scale(0.95); opacity:0; pointer-events:none; font-family:'Be Vietnam Pro',sans-serif;"
      >
        <!-- HEADER -->
        <div style="background:linear-gradient(135deg, #c94a29 0%, #8f2e15 100%); padding:13px 16px; color:#fff; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px; flex:1;">
            <div style="width:34px; height:34px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:17px;">
              🪵
            </div>
            <div>
              <div style="font-weight:700; font-size:13.5px; display:flex; align-items:center; gap:6px;">
                <span>Tư Vấn Nội Thất MORIOO</span>
                <span style="width:7px; height:7px; border-radius:50%; background:#4ade80;"></span>
              </div>
              <div id="moriooAiHeaderSubtitle" style="font-size:10.5px; opacity:0.92;">
                Gemini 3.8 Flash • Phản hồi tức thì & Đồng bộ DB
              </div>
            </div>
          </div>
          <button 
            onclick="toggleMoriooChat()" 
            style="width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.15); border:none; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:14px;"
            title="Đóng chat"
          >
            ✕
          </button>
        </div>

        <!-- QUICK PROMPT CHIPS -->
        <div id="moriooChatChips" style="padding:8px 10px; background:#faf7f2; border-bottom:1px solid #eee; display:flex; gap:6px; overflow-x:auto; white-space:nowrap; font-size:11px; scrollbar-width:thin;">
          <button onclick="sendQuickPrompt('các mẫu bàn ghế')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #e0dcd5; color:#444; cursor:pointer; font-size:11px; font-weight:500;">🪑 Các mẫu bàn ghế</button>
          <button onclick="sendQuickPrompt('Tủ & Kệ gỗ sồi')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #e0dcd5; color:#444; cursor:pointer; font-size:11px; font-weight:500;">🚪 Tủ & Kệ gỗ sồi</button>
          <button onclick="sendQuickPrompt('Giường ngủ tatami')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #e0dcd5; color:#444; cursor:pointer; font-size:11px; font-weight:500;">🛏️ Giường Tatami</button>
          <button onclick="sendQuickPrompt('Chính sách bảo hành')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #e0dcd5; color:#444; cursor:pointer; font-size:11px; font-weight:500;">🛡️ Bảo hành 36 tháng</button>
          <button onclick="sendQuickPrompt('Phí giao hàng & lắp đặt')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #e0dcd5; color:#444; cursor:pointer; font-size:11px; font-weight:500;">🚚 Giao hàng miễn phí</button>
          <button onclick="sendQuickPrompt('Hệ thống Showroom')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #e0dcd5; color:#444; cursor:pointer; font-size:11px; font-weight:500;">📍 Showroom</button>
        </div>

        <!-- MESSAGES CONTAINER -->
        <div id="moriooChatMessages" style="flex:1; padding:12px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; background:#fcfbf9; font-size:12px;">
          <!-- Welcome message -->
          <div style="display:flex; gap:8px; align-self:flex-start; max-width:88%;">
            <div style="width:26px; height:26px; border-radius:50%; background:#c94a29; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0;">
              M
            </div>
            <div style="background:#fff; color:#333; padding:10px 12px; border-radius:14px; border-top-left-radius:2px; box-shadow:0 2px 6px rgba(0,0,0,0.04); border:1px solid #ece7df; line-height:1.5;">
              Dạ MORIOO xin chào Quý khách! 👋<br><br>
              Em có thể hỗ trợ tư vấn về <strong>Nội thất gỗ sồi tự nhiên, Tủ & Kệ, 5 Gói dịch vụ khách hàng</strong>, hoặc tra cứu tiến độ đơn hàng cho Quý khách ngay bây giờ ạ!<br><br>
              <em style="color:#777; font-size:11px;">(Mẹo: Bạn có thể nhập <strong>/key &lt;gemini_key&gt;</strong> để kích hoạt Google Gemini 3.8 Flash)</em>
            </div>
          </div>
        </div>

        <!-- TYPING INDICATOR -->
        <div id="moriooChatTyping" style="display:none; padding:6px 14px; font-size:11px; color:#888; font-style:italic; background:#fcfbf9;">
          <span>Tư vấn viên MORIOO AI đang soạn tin...</span>
        </div>

        <!-- INPUT FORM -->
        <form onsubmit="handleMoriooChatSubmit(event)" style="padding:10px 12px; border-top:1px solid #eee; background:#fff; display:flex; align-items:center; gap:8px;">
          <input 
            id="moriooChatInput" 
            type="text" 
            autocomplete="off"
            placeholder="Nhập câu hỏi hoặc mã đơn (MOR-xxxxx)..." 
            style="flex:1; padding:9px 14px; font-size:12px; border-radius:30px; border:1px solid #ddd; outline:none; background:#f9f8f6; font-family:inherit;"
          />
          <button 
            type="submit" 
            id="moriooChatSendBtn"
            style="width:34px; height:34px; border-radius:50%; background:#c94a29; border:none; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:background 0.2s;"
            title="Gửi tin nhắn"
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>
      </div>
    `;

    document.body.appendChild(container);
    loadChatHistory();
  }

  window.toggleMoriooChat = function () {
    const win = document.getElementById('moriooChatWindow');
    if (!win) return;
    isOpen = !isOpen;

    if (isOpen) {
      win.style.opacity = '1';
      win.style.transform = 'scale(1)';
      win.style.pointerEvents = 'auto';
      document.getElementById('moriooChatBadge')?.style.setProperty('display', 'none');
      setTimeout(() => {
        document.getElementById('moriooChatInput')?.focus();
        scrollToBottom();
      }, 100);
    } else {
      win.style.opacity = '0';
      win.style.transform = 'scale(0.95)';
      win.style.pointerEvents = 'none';
    }
  };
  window.toggleMocChat = window.toggleMoriooChat;

  window.sendQuickPrompt = function (text) {
    const input = document.getElementById('moriooChatInput');
    if (input) {
      input.value = text;
      const fakeEvent = { preventDefault: () => {} };
      window.handleMoriooChatSubmit(fakeEvent);
    }
  };

  function scrollToBottom() {
    const container = document.getElementById('moriooChatMessages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  async function loadChatHistory() {
    try {
      const res = await resilientFetch(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`);
      const data = await res.json();
      if (data && data.messages && data.messages.length > 0) {
        chatHistory = data.messages;
        renderMessages();
      }
    } catch (e) {
      // Local storage fallback for history
      try {
        const local = localStorage.getItem(`morioo_history_${sessionId}`);
        if (local) {
          chatHistory = JSON.parse(local);
          renderMessages();
        }
      } catch (_) {}
    }
  }

  function renderMessages() {
    const container = document.getElementById('moriooChatMessages');
    if (!container) return;

    if (chatHistory.length === 0) return;

    container.innerHTML = chatHistory.map(msg => {
      const isCustomer = msg.sender === 'customer';
      if (isCustomer) {
        return `
          <div style="display:flex; justify-content:flex-end;">
            <div style="background:#c94a29; color:#fff; padding:10px 14px; border-radius:14px; border-top-right-radius:2px; max-width:85%; line-height:1.5; word-break:break-word; box-shadow:0 2px 6px rgba(201,74,41,0.2);">
              ${formatChatText(msg.message)}
            </div>
          </div>
        `;
      } else {
        return `
          <div style="display:flex; gap:8px; align-self:flex-start; max-width:88%;">
            <div style="width:26px; height:26px; border-radius:50%; background:#c94a29; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; margin-top:2px;">
              M
            </div>
            <div style="background:#fff; color:#333; padding:10px 14px; border-radius:14px; border-top-left-radius:2px; border:1px solid #ece7df; line-height:1.5; word-break:break-word; box-shadow:0 2px 6px rgba(0,0,0,0.04);">
              ${formatChatText(msg.message)}
            </div>
          </div>
        `;
      }
    }).join('');

    try {
      localStorage.setItem(`morioo_history_${sessionId}`, JSON.stringify(chatHistory));
    } catch (_) {}

    scrollToBottom();
  }

  window.handleMoriooChatSubmit = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    const input = document.getElementById('moriooChatInput');
    const msg = (input ? input.value : '').trim();
    if (!msg || isSending) return;

    if (input) input.value = '';
    isSending = true;

    // 1. Direct In-Chat Gemini API Key Configuration Command
    const lower = msg.toLowerCase();
    if (lower.startsWith('/key ') || lower.startsWith('/gemini ') || lower.startsWith('/apikey ')) {
      const parts = msg.split(' ');
      const newKey = parts.slice(1).join(' ').trim();
      
      chatHistory.push({ sender: 'customer', message: msg });
      renderMessages();

      if (!newKey) {
        chatHistory.push({
          sender: 'advisor',
          message: '⚠️ Vui lòng cung cấp API Key theo cú pháp: `/key AIzaSy...`'
        });
        renderMessages();
        isSending = false;
        return;
      }

      try {
        const cfgRes = await resilientFetch('/api/admin/gemini-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gemini_api_key: newKey })
        });
        const cfgData = await cfgRes.json();
        
        chatHistory.push({
          sender: 'advisor',
          message: `🎉 **Đã lưu cấu hình Google Gemini API thành công!**\n\n• **Mô hình AI:** \`gemini-3.8-flash\`\n• **Trạng thái:** Đã kết nối và đồng bộ vào \`.env\` & \`morioo_store.db\`.\n\nTừ bây giờ, Chatbot sẽ tư vấn bằng siêu trí tuệ nhân tạo Gemini cho mọi khách hàng!`
        });
      } catch (err) {
        chatHistory.push({
          sender: 'advisor',
          message: `⚠️ Không thể lưu trực tiếp qua server: ${err.message}. Bạn cũng có thể dán key vào file \`.env\` (dòng \`GEMINI_API_KEY=${newKey}\`) hoặc vào trang Admin!`
        });
      }
      renderMessages();
      isSending = false;
      return;
    }

    let userId = null;
    let customerName = 'Khách hàng';
    let customerPhone = '';
    let customerEmail = '';

    try {
      const storedUser = localStorage.getItem('morioo_current_user') || localStorage.getItem('moho_user');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        userId = u.id;
        customerName = u.fullname || u.name || 'Khách hàng';
        customerPhone = u.phone || '';
        customerEmail = u.email || '';
      }
    } catch (_) {}

    chatHistory.push({
      sender: 'customer',
      message: msg
    });
    renderMessages();

    const typing = document.getElementById('moriooChatTyping');
    if (typing) typing.style.display = 'block';
    scrollToBottom();

    try {
      // Send to server (multi-candidate endpoint)
      const res = await resilientFetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: msg,
          user_id: userId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail
        })
      });

      const data = await res.json();
      if (data && data.success && data.messages) {
        chatHistory = data.messages;
      } else if (data && data.reply) {
        chatHistory.push({
          sender: 'advisor',
          message: data.reply
        });
      } else {
        chatHistory.push({
          sender: 'advisor',
          message: getClientFallbackReply(msg)
        });
      }
      renderMessages();
    } catch (err) {
      console.warn('Backend chat unreachable, utilizing smart client fallback knowledge:', err);
      // Generate intelligent offline reply immediately so the user NEVER gets an ugly network error
      const offlineReply = getClientFallbackReply(msg);
      
      let note = '';
      if (window.location.protocol === 'file:') {
        note = `\n\n<small style="color:#999;">💡 <em>Mẹo: Bạn đang mở trang bằng file:/// máy tính. Hãy chạy server <code>python app.py</code> và mở <code>http://localhost:5000</code> để chat được lưu ngay vào Database SQLite.</em></small>`;
      }

      chatHistory.push({
        sender: 'advisor',
        message: offlineReply + note
      });
      renderMessages();

      // Store in offline question queue
      try {
        const offlineQueue = JSON.parse(localStorage.getItem('morioo_offline_questions') || '[]');
        offlineQueue.push({
          session_id: sessionId,
          customer_name: customerName,
          question: msg,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('morioo_offline_questions', JSON.stringify(offlineQueue));
      } catch (_) {}
    } finally {
      if (typing) typing.style.display = 'none';
      isSending = false;
      if (input) input.focus();
    }
  };
  window.handleMocChatSubmit = window.handleMoriooChatSubmit;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectChatWidget);
  } else {
    injectChatWidget();
  }
})();
