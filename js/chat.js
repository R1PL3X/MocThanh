/**
 * MORIOO Floating Customer Service Chatbox Widget
 * Includes real-time database-backed consultation, AI interior advisor,
 * order lookup, and persistent chat sessions.
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
        title="Tư vấn trực tuyến MORIOO"
      >
        <span style="position:relative; display:inline-block; width:10px; height:10px;">
          <span style="position:absolute; width:100%; height:100%; border-radius:50%; background:#22c55e; opacity:0.75; animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></span>
          <span style="position:relative; display:inline-block; width:10px; height:10px; border-radius:50%; background:#16a34a;"></span>
        </span>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>Tư vấn MORIOO</span>
        <span id="moriooChatBadge" style="display:none; background:#ef4444; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:10px; margin-left:-4px;">1</span>
      </button>

      <!-- CHAT WINDOW MODAL -->
      <div 
        id="moriooChatWindow" 
        style="position:fixed; bottom:85px; right:24px; z-index:9999; width:380px; max-width:calc(100vw - 32px); height:540px; max-height:80vh; background:#fff; border-radius:18px; box-shadow:0 20px 40px rgba(0,0,0,0.18); border:1px solid #ebe6df; display:flex; flex-direction:column; overflow:hidden; transition:all 0.25s ease; transform:scale(0.95); opacity:0; pointer-events:none; font-family:'Be Vietnam Pro',sans-serif;"
      >
        <!-- HEADER -->
        <div style="background:linear-gradient(135deg, #c94a29 0%, #8f2e15 100%); padding:14px 16px; color:#fff; display:flex; align-items:center; justify-content:between;">
          <div style="display:flex; align-items:center; gap:12px; flex:1;">
            <div style="width:36px; height:36px; border-radius:50%; background:rgba(255,255,255,0.2); display:flex; align-items:center; justify-content:center; font-size:18px;">
              🪵
            </div>
            <div>
              <div style="font-weight:700; font-size:14px; display:flex; align-items:center; gap:6px;">
                <span>Tư Vấn Nội Thất MORIOO</span>
                <span style="width:7px; height:7px; border-radius:50%; background:#4ade80;"></span>
              </div>
              <div style="font-size:11px; opacity:0.9;">
                MORIOO AI • Phản hồi tức thì
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
        <div id="moriooChatChips" style="padding:8px 12px; background:#faf7f2; border-bottom:1px solid #eee; display:flex; gap:6px; overflow-x:auto; white-space:nowrap; font-size:11px;">
          <button onclick="sendQuickPrompt('các mẫu bàn ghế')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">🪑 Các mẫu bàn ghế</button>
          <button onclick="sendQuickPrompt('Tủ & Kệ')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">🚪 Tủ & Kệ gỗ sồi</button>
          <button onclick="sendQuickPrompt('Giường ngủ tatami')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">🛏️ Giường Tatami</button>
          <button onclick="sendQuickPrompt('Ghế sofa thư giãn')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">🛋️ Ghế thư giãn</button>
          <button onclick="sendQuickPrompt('Dịch vụ nội thất')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">🛎️ 5 Gói dịch vụ</button>
          <button onclick="sendQuickPrompt('Phí giao hàng & lắp đặt')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">🚚 Giao hàng</button>
          <button onclick="sendQuickPrompt('Chính sách bảo hành')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">🛡️ Bảo hành 36 tháng</button>
          <button onclick="sendQuickPrompt('Hệ thống Showroom')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">📍 Showroom</button>
          <button onclick="sendQuickPrompt('Tra cứu đơn hàng')" style="padding:4px 10px; border-radius:20px; background:#fff; border:1px solid #ddd; color:#444; cursor:pointer; font-size:11px;">📦 Tra cứu đơn</button>
        </div>

        <!-- MESSAGES CONTAINER -->
        <div id="moriooChatMessages" style="flex:1; padding:14px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; background:#fcfbf9; font-size:12px;">
          <!-- Welcome message -->
          <div style="display:flex; gap:8px; align-self:flex-start; max-width:85%;">
            <div style="width:26px; height:26px; border-radius:50%; background:#c94a29; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0;">
              M
            </div>
            <div style="background:#fff; color:#333; padding:10px 12px; border-radius:14px; border-top-left-radius:2px; box-shadow:0 2px 6px rgba(0,0,0,0.04); border:1px solid #ece7df; line-height:1.5;">
              Dạ MORIOO xin chào Quý khách! 👋<br><br>
              Em có thể hỗ trợ tư vấn về <strong>Nội thất gỗ sồi tự nhiên, Tủ & Kệ, 5 Gói dịch vụ khách hàng</strong>, hoặc tra cứu tiến độ đơn hàng cho Quý khách ngay bây giờ ạ!
            </div>
          </div>
        </div>

        <!-- TYPING INDICATOR -->
        <div id="moriooChatTyping" style="display:none; padding:6px 16px; font-size:11px; color:#888; font-style:italic; background:#fcfbf9;">
          <span>Tư vấn viên MORIOO đang soạn tin...</span>
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
      document.getElementById('moriooChatSendBtn')?.click();
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
      const res = await fetch(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        chatHistory = data.messages;
        renderMessages();
      }
    } catch (e) {
      console.warn('Could not load chat history:', e);
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

    scrollToBottom();
  }

  window.handleMoriooChatSubmit = async function (e) {
    e.preventDefault();
    const input = document.getElementById('moriooChatInput');
    const msg = input.value.trim();
    if (!msg || isSending) return;

    input.value = '';
    isSending = true;

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
      const res = await fetch('/api/chat/send', {
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
      if (res.ok && data.success) {
        chatHistory = data.messages || chatHistory;
        renderMessages();
      } else {
        chatHistory.push({
          sender: 'advisor',
          message: 'Dạ hệ thống đang bận một chút, Quý khách vui lòng thử lại sau giây lát ạ!'
        });
        renderMessages();
      }
    } catch (err) {
      chatHistory.push({
        sender: 'advisor',
        message: 'Dạ kết nối mạng không ổn định, Quý khách vui lòng gửi lại tin nhắn nhé!'
      });
      renderMessages();
    } finally {
      if (typing) typing.style.display = 'none';
      isSending = false;
      input.focus();
    }
  };
  window.handleMocChatSubmit = window.handleMoriooChatSubmit;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectChatWidget);
  } else {
    injectChatWidget();
  }
})();
