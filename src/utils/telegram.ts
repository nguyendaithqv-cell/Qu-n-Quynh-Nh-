import { Order, StoreConfig, TelegramConfig } from '../types';

/**
 * Sends a message to a Telegram chat using Telegram Bot API.
 */
export async function sendTelegramMessage(botToken: string, chatId: string, text: string): Promise<boolean> {
  if (!botToken || !chatId) return false;
  
  const token = botToken.trim();
  const chat = chatId.trim();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chat,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });
    
    if (!response.ok) {
      const errText = await response.text();
      console.error('Telegram API error:', errText);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Fetch error sending Telegram message:', err);
    return false;
  }
}

/**
 * Format a Vietnamese friendly message for a new order.
 */
export function formatNewOrderMessage(order: Order, storeName: string, isExtraOrder?: boolean): string {
  const isBooking = order.tableId === 'BOOKING';
  const tablePart = isBooking 
    ? `🗓 <b>ĐẶT BÀN TRƯỚC (BOOKING)</b>` 
    : order.tableName 
      ? `🪑 <b>BÀN: ${order.tableName}</b>` 
      : `🚚 <b>Giao hàng tận nơi</b>`;

  const itemDetails = order.items
    .map((item, i) => `  ${i + 1}. <b>${item.productName}</b> × ${item.quantity} (${item.priceOnOrder.toLocaleString('vi-VN')}đ)`)
    .join('\n');

  let title = isExtraOrder 
    ? `<b>🔔 KHÁCH GỌI THÊM MÓN từ ${storeName || 'Hệ Thống'}!</b>`
    : `<b>🔔 CÓ ĐƠN HÀNG MỚI từ ${storeName || 'Hệ Thống'}!</b>`;

  let text = `${title}\n`;
  text += `----------------------------------------\n`;
  text += `📍 <b>Vị trí / Loại hình:</b> ${tablePart}\n`;
  text += `🧾 <b>Mã Bill:</b> <code>${order.billCode}</code>\n`;
  text += `👤 <b>Khách hàng:</b> ${order.customerName}\n`;
  if (order.customerPhone) {
    text += `📞 <b>Số điện thoại:</b> <code>${order.customerPhone}</code>\n`;
  }
  if (order.customerAddress && order.customerAddress !== 'Tại quán' && order.customerAddress !== 'Đặt trước') {
    text += `🏠 <b>Địa chỉ:</b> ${order.customerAddress}\n`;
  }
  if (order.note) {
    text += `📝 <b>Ghi chú:</b> <i>"${order.note}"</i>\n`;
  }
  
  text += `\n📦 <b>CHI TIẾT MÓN ĂN:</b>\n${itemDetails}\n`;
  text += `----------------------------------------\n`;
  text += `💵 <b>Tạm tính:</b> ${order.subTotal.toLocaleString('vi-VN')}đ\n`;
  if (order.discountAmount > 0) {
    text += `🎁 <b>Giảm giá:</b> -${order.discountAmount.toLocaleString('vi-VN')}đ\n`;
  }
  if (order.depositAmount && order.depositAmount > 0) {
    text += `💰 <b>Số tiền đặt cọc:</b> ${order.depositAmount.toLocaleString('vi-VN')}đ\n`;
  }
  text += `💰 <b>Thực thanh toán:</b> <b>${order.totalAmount.toLocaleString('vi-VN')}đ</b>\n`;
  text += `💳 <b>Thanh toán:</b> ${order.paymentMethod === 'banking' ? 'Chuyển khoản (Banking)' : 'Tiền mặt (Cash / COD)'}\n`;
  text += `⏳ <b>Trạng thái:</b> Đang chờ duyệt\n`;
  text += `⏰ <b>Thời gian:</b> ${new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} ${new Date(order.createdAt).toLocaleDateString('vi-VN')}`;

  return text;
}

/**
 * Format message when order status or payment status updates.
 */
export function formatOrderStatusChangeMessage(order: Order, prevStatus: string, prevPaymentStatus: string, storeName: string): string {
  const statusLabels: Record<string, string> = {
    pending: 'Đang xử lý ⏳',
    preparing: 'Đang chuẩn bị 🍳',
    delivering: 'Đang giao hàng 🚚',
    completed: 'Đã hoàn thành ✅',
    cancelled: 'Đã hủy ❌',
  };

  const paymentLabels: Record<string, string> = {
    unpaid: 'Chưa thanh toán ❌',
    paid: 'Đã thanh toán thành công 💳',
    debt: 'Ghi nợ khách hàng 📝',
  };

  let title = `<b>🔔 CẬP NHẬT ĐƠN HÀNG [${order.billCode}]</b>\n`;
  let totalDelta = order.totalAmount;
  if (order.depositAmount && order.depositAmount > 0) {
    totalDelta = Math.max(0, order.totalAmount - order.depositAmount);
  }

  if (order.status === 'completed' && prevStatus !== 'completed') {
    title = `<b>✅ ĐƠN HÀNG HOÀN THÀNH - ${order.billCode}</b>\n`;
  } else if (order.status === 'cancelled' && prevStatus !== 'cancelled') {
    title = `<b>❌ ĐƠN HÀNG ĐÃ HỦY - ${order.billCode}</b>\n`;
  } else if (order.paymentStatus === 'paid' && prevPaymentStatus !== 'paid') {
    title = `<b>💳 ĐƠN HÀNG ĐÃ THANH TOÁN THÀNH CÔNG - ${order.billCode}</b>\n`;
  }

  let text = `${title}`;
  text += `----------------------------------------\n`;
  text += `🏪 <b>Cửa hàng:</b> ${storeName || 'Hệ Thống'}\n`;
  text += `👤 <b>Khách hàng:</b> ${order.customerName} (${order.customerPhone || 'Không có SĐT'})\n`;
  text += `🪑 <b>Vị trí:</b> ${order.tableName || (order.tableId === 'BOOKING' ? 'Đặt trước' : 'Giao hàng tận nơi')}\n`;
  text += `----------------------------------------\n`;
  text += `⚙️ <b>Trạng thái đơn:</b> <b>${statusLabels[order.status] || order.status}</b> (cũ: ${statusLabels[prevStatus] || prevStatus})\n`;
  text += `💰 <b>Trạng thái thanh toán:</b> <b>${paymentLabels[order.paymentStatus] || order.paymentStatus}</b> (cũ: ${paymentLabels[prevPaymentStatus] || prevPaymentStatus})\n`;
  text += `💵 <b>Tổng thanh toán:</b> ${order.totalAmount.toLocaleString('vi-VN')}đ\n`;
  if (order.depositAmount && order.depositAmount > 0) {
    text += `📥 <b>Tiền đặt cọc:</b> ${order.depositAmount.toLocaleString('vi-VN')}đ\n`;
    text += `💰 <b>Thu thêm cashier nhận:</b> <b>${totalDelta.toLocaleString('vi-VN')}đ</b>\n`;
  }
  if (order.cancellationReason) {
    text += `📝 <b>Lý do hủy:</b> <i>"${order.cancellationReason}"</i>\n`;
  }
  text += `⏰ <b>Cập nhật lúc:</b> ${new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})} ${new Date().toLocaleDateString('vi-VN')}`;

  return text;
}

/**
 * Format a Daily Summary message.
 */
export function formatDailySummaryMessage(orders: Order[], dateStr: string, storeName: string): string {
  // Filter orders for the selected date
  const dayOrders = orders.filter(o => o.createdAt.startsWith(dateStr));
  
  const completedOrders = dayOrders.filter(o => o.status === 'completed');
  const paidOrders = dayOrders.filter(o => o.paymentStatus === 'paid');
  const debtOrders = dayOrders.filter(o => o.paymentStatus === 'debt');
  const cancelledOrders = dayOrders.filter(o => o.status === 'cancelled');
  const pendingOrOther = dayOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');

  let totalRevenue = 0; // Completed and Paid
  let totalCash = 0;
  let totalBanking = 0;
  let totalDiscounts = 0;
  let totalDeposits = 0;
  let totalDebt = 0;

  // Track product quantities sold
  const productSalesMap: Record<string, { qty: number, amt: number }> = {};

  dayOrders.forEach(o => {
    // Collect discounts
    if (o.status !== 'cancelled') {
      totalDiscounts += o.discountAmount || 0;
      totalDeposits += o.depositAmount || 0;
    }

    if (o.paymentStatus === 'paid') {
      totalRevenue += o.totalAmount;
      if (o.paymentMethod === 'banking') {
        totalBanking += o.totalAmount;
      } else {
        totalCash += o.totalAmount;
      }
    } else if (o.paymentStatus === 'debt') {
      totalDebt += o.totalAmount;
    }

    // Product frequency counting for successful orders
    if (o.status !== 'cancelled') {
      o.items.forEach(item => {
        if (!productSalesMap[item.productName]) {
          productSalesMap[item.productName] = { qty: 0, amt: 0 };
        }
        productSalesMap[item.productName].qty += item.quantity;
        productSalesMap[item.productName].amt += item.quantity * item.priceOnOrder;
      });
    }
  });

  // Sort best selling items
  const sortedSales = Object.entries(productSalesMap)
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5); // top 5

  const performanceList = sortedSales.length > 0 
    ? sortedSales.map(([name, stat], idx) => `  ${idx + 1}. <b>${name}</b> × ${stat.qty} (${stat.amt.toLocaleString('vi-VN')}đ)`).join('\n')
    : '  <i>Không ghi nhận món nào được bán hôm nay.</i>';

  // Format Date gracefully
  const formattedDate = dateStr.split('-').reverse().join('/');

  let text = `<b>📊 BÁO CÁO DOANH THU CUỐI NGÀY [${formattedDate}]</b>\n`;
  text += `🏠 <b>Cửa hiệu:</b> <b>${storeName || 'Hệ Thống'}</b>\n`;
  text += `----------------------------------------\n`;
  text += `📝 <b>THỐNG KÊ ĐƠN HÀNG:</b>\n`;
  text += `  • Tổng số đơn đặt: <b>${dayOrders.length} đơn</b>\n`;
  text += `  • Đã hoàn thành: <b>${completedOrders.length} đơn</b>\n`;
  text += `  • Đã thanh toán: <b>${paidOrders.length} đơn</b>\n`;
  text += `  • Ghi nợ khách hàng: <b>${debtOrders.length} đơn</b>\n`;
  text += `  • Đã hủy đơn: <b>${cancelledOrders.length} đơn</b>\n`;
  text += `  • Đang chờ / phục vụ: <b>${pendingOrOther.length} đơn</b>\n`;
  text += `----------------------------------------\n`;
  text += `💵 <b>CHI TIẾT TÀI CHÍNH DOANH THU:</b>\n`;
  text += `  • <b>Tổng doanh thu thực nhận:</b> <pre>${totalRevenue.toLocaleString('vi-VN')} đ</pre>\n`;
  text += `    - Qua ngân hàng (Banking): ${totalBanking.toLocaleString('vi-VN')}đ\n`;
  text += `    - Tiền mặt (Cash): ${totalCash.toLocaleString('vi-VN')}đ\n`;
  text += `  • <b>Tổng tiền ghi nợ mới:</b> <pre>${totalDebt.toLocaleString('vi-VN')} đ</pre>\n`;
  text += `  • <b>Tổng trị giá đặt cọc:</b> ${totalDeposits.toLocaleString('vi-VN')}đ\n`;
  text += `  • <b>Tổng khuyến mãi đã giảm:</b> ${totalDiscounts.toLocaleString('vi-VN')}đ\n`;
  text += `----------------------------------------\n`;
  text += `🏆 <b>MÓN BÁN CHẠY NHẤT HÔM NAY:</b>\n${performanceList}\n`;
  text += `----------------------------------------\n`;
  text += `⏰ <i>Báo cáo tổng hợp tự động gửi từ Trình quản lý POS.</i>`;

  return text;
}

/**
 * Automated checker for daily summaries inside applet cycle.
 * Triggers once daily when conditions match.
 */
export async function checkAndSendAutoSummary(
  orders: Order[],
  storeConfig: StoreConfig,
  onUpdateStoreConfig: (updated: StoreConfig) => void
): Promise<boolean> {
  const tele = storeConfig.telegram;
  if (!tele || !tele.enabled || !tele.notifySummaryEnabled || !tele.botToken || !tele.chatId) {
    return false;
  }

  const now = new Date();
  
  // Format local date stamp YYYY-MM-DD
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  const dateStr = `${localYear}-${localMonth}-${localDay}`;

  // If already sent today, skip
  if (tele.lastSummarySentDate === dateStr) {
    return false;
  }

  // Parse summary time (e.g., "22:00")
  const targetTime = tele.notifySummaryTime || '22:00';
  const [targetHour, targetMinute] = targetTime.split(':').map(Number);
  
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // If current local time is past or equal to the scheduled time, trigger summary!
  if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
    const summaryText = formatDailySummaryMessage(orders, dateStr, storeConfig.name);
    
    console.log(`[Telegram Auto-Summary] Scheduled time reached (${targetTime}). Sending summary for ${dateStr}...`);
    const success = await sendTelegramMessage(tele.botToken, tele.chatId, summaryText);
    
    if (success) {
      // Mark as sent for today to prevent continuous trigger
      const updatedConfig: StoreConfig = {
        ...storeConfig,
        telegram: {
          ...tele,
          lastSummarySentDate: dateStr
        }
      };
      await onUpdateStoreConfig(updatedConfig);
      return true;
    }
  }

  return false;
}
