import fs from "fs/promises";
import pkg from "whatsapp-web.js";
import { exportData } from "../../system/exportData.js";
import { faq } from "../../system/FAQ.js";
import { extractionOrder } from "../../system/ordering/extractionOrder.js";
import { sendProofToGroup } from "../../system/broadcasting/sendProof.js";
import { handleDeliveryResponse } from "../../system/broadcasting/sendDelivery.js";
import { generateFormMultipleOrder } from "../../system/ordering/generateFormMultipleOrder.js";
import { deleteOrder } from "../../system/ordering/deleteOrder.js";
import {
  cancelOrder,
  validationOrder,
} from "../../system/ordering/validationOrder.js";
import { editingOrder as sendEditingOrderForm } from "../../system/ordering/editingOrder.js";
import { handleOrderConfirmation } from "../../system/ordering/editOrder.js";
import { welcomedUsers } from "../../settings/runtimeUsers.js";
import {
  pendingProof,
  sessions,
  paymentStatus,
  orderConfirmationSession,
  deliverySession,
  multipleFormSession,
  editingOrder as editingOrderSession,
  pendingOrders,
  userMode,
} from "../../settings/globalVariables.js";
import { sendQrisPayment } from "../../system/ordering/qrisPayment.js";

const { MessageMedia } = pkg;

const MAIN_MENU =
  "Halo kak👋\n\nTerima kasih sudah menghubungi Klikbi Go🍽️🚚\n\nSaya admin KlikBiGo, ada yang bisa kami bantu?\n[1] Pesan Produk\n[2] FAQ\n[3] Hubungi Admin";

async function clearPersistedSession(userId) {
  try {
    const rawData = await fs.readFile("data/sessions.json", "utf8");
    const json = rawData ? JSON.parse(rawData) : {};
    const storedOrders = json?.data?.pendingOrders ?? {};
    const storedProof = json?.data?.pendingProof ?? {};
    for (const [orderId, order] of Object.entries(storedOrders)) {
      if (order.customer === userId) delete storedOrders[orderId];
    }
    delete storedProof[userId];
    json.data ??= {};
    json.data.pendingOrders = storedOrders;
    json.data.pendingProof = storedProof;
    await fs.writeFile(
      "data/sessions.json",
      JSON.stringify(json, null, 4),
      "utf8",
    );
  } catch (error) {
    console.error("Gagal menghapus session dari sessions.json", error);
  }
}

function resetCustomerSession(userId) {
  delete sessions[userId];
  delete userMode[userId];
  delete multipleFormSession[userId];
  delete editingOrderSession[userId];
  delete orderConfirmationSession[userId];
  delete paymentStatus[userId];
  delete pendingProof[userId];
}

export async function handleCustomerSession({
  message,
  userId,
  text,
  client,
  response,
  logger,
  monitor,
}) {
  if (message.hasMedia) {
    if (!pendingProof[userId]) return true;
    try {
      await response.send(
        userId,
        "Baik, sebentar ya kak. Kami cek dulu bukti pembayarannya 🙏",
      );

      const proofPhoto = await message.downloadMedia();

      if (!proofPhoto) {
        logger.error("DOWNLOAD MEDIA: hasilnya null");

        await response.send(
          userId,
          "Mohon maaf kak, foto bukti pembayaran tidak dapat dibaca. Silakan kirim ulang.",
        );

        return true;
      }

      const orderId = pendingProof[userId];
      const order = pendingOrders[orderId];
      if (!order?.data) {
        await response.send(
          userId,
          "Data pesanan tidak ditemukan. Mohon hubungi admin.",
        );
        return true;
      }

      await sendProofToGroup(proofPhoto, orderId, order.data, client);
    } catch (error) {
      logger.error(error);
      await response.send(
        userId,
        "Mohon maaf kak, bukti pembayaran belum bisa diteruskan. Silakan kirim ulang foto bukti pembayarannya.",
      );
    }
    return true;
  }

  if (
    text === "export" &&
    ["64282960068848@lid", "28420016742628@lid"].includes(userId)
  ) {
    if (!(await monitor.guardians.export.begin())) {
      await response.send(userId, "Sedang ada proses export yang berjalan.");
      return true;
    }
    try {
      await exportData();
      await response.sendMedia(
        userId,
        MessageMedia.fromFilePath(
          "./chatbot-structure/file/customer_recap.xlsx",
        ),
        "",
        "low",
      );
      await monitor.guardians.export.finish(true);
    } catch (error) {
      logger.error(error);
      await monitor.guardians.export.finish(false);
    }
    welcomedUsers.add(userId);
    return true;
  }

  if (!welcomedUsers.has(userId)) {
    welcomedUsers.add(userId);
    await response.send(userId, MAIN_MENU);
    return true;
  }

  if (text.toLocaleLowerCase() === "menu") {
    resetCustomerSession(userId);
    await response.send(userId, MAIN_MENU);
    return true;
  }
  if (text.toLowerCase() === "keluar") {
    resetCustomerSession(userId);
    await response.send(
      userId,
      "Terima kasih sudah menghubungi kami, semoga kita bertemu kembali di lain waktu 🙏🏻",
    );
    welcomedUsers.delete(userId);
    await clearPersistedSession(userId);
    return true;
  }
  if (text.toLocaleLowerCase() === "ganti") {
    await response.send(
      userId,
      "📝 *JENIS PEMESANAN ANDA*\n===========================\n[1] Single Order\n[2] Multiple Order\n\n*_*Jika ingin kembali ke menu, ketik 'menu'_*",
    );
    userMode[userId] = "form";
    delete sessions[userId];
    delete multipleFormSession[userId];
    return true;
  }
  if (userMode[userId] === "human-admin") return true;
  if (userMode[userId] === "faq") {
    await response.send(userId, await faq(text));
    return true;
  }
  if (sessions[userId]) {
    if (
      !/nama\s*pemesan|id\s*produk|alamat\s*lengkap\s*pengantaran/i.test(text)
    ) {
      await response.send(
        userId,
        "Mohon untuk mengisi formulir pesanan kakak.",
      );
      return true;
    }
    const responseOrder = await extractionOrder(text, userId);
    if (responseOrder) await response.send(userId, responseOrder);
    return true;
  }
  if (userMode[userId] === "form") {
    if (text === "1") {
      await response.send(
        userId,
        "Baik kak, supaya kami bisa proses pesanannya, mohon info ya.\n\n📌Nama Pemesan: \n📌ID Produk: \n📌Jumlah Pesanan: \n📌Nomor Telepon Aktif: \n\n🏠 *TUJUAN PENGANTARAN*\n=============================\n_Tolong isi alamat pengantaran secara lengkap, jika berlokasi diluar gedung/kawasan (Gymnas, Zeta, CA/CB/LAB, Dll) SV IPB_\n\n- Perumahan/Tempat\n- Jalan + Nomor\n- Kelurahan/Desa\n- Kecamatan\n- Kota/Kabupaten\n- Gunakan koma sebagai pemisah\n\n*Cth: Kos Lodaya, Jl. Lodaya II No.15, Babakan, Bogor Tengah, Kota Bogor*\n\nIsi alamat Anda di bawah 👇\n📌Alamat Lengkap Pengantaran: \n\n*_*Jika tidak jadi memesan, ketik 'keluar'_*\n*_*Jika ingin ganti jenis pemesanan, ketik 'ganti'_*",
      );
      sessions[userId] = true;
      delete userMode[userId];
      return true;
    }
    if (text === "2") {
      await response.send(
        userId,
        "📝 Berapa produk yang ingin anda pesan?\n[1] 1\n[2] 2\n[3] 3\n[4] 4\n[5] 5\n\n*_*Jika ingin ganti jenis pemesanan, ketik 'ganti'_*",
      );
      multipleFormSession[userId] = true;
      delete userMode[userId];
      return true;
    }
    await response.send(
      userId,
      "Mohon maaf, sepertinya kakak memilih diluar pilihan yang ada. Silahkan pilih ulang kembali.",
    );
    return true;
  }
  if (multipleFormSession[userId]) {
    if (Number(text) > 5) {
      await response.send(
        userId,
        "Mohon maaf, sepertinya jumlah produk yang ingin kakak pesan sudah diluar batas.",
      );
      return true;
    }
    await response.send(userId, await generateFormMultipleOrder(text));
    sessions[userId] = true;
    delete multipleFormSession[userId];
    return true;
  }
  if (orderConfirmationSession[userId]?.status) {
    await handleOrderConfirmation(text, userId);
    return true;
  }
  if (editingOrderSession[userId]?.status) {
    const editSession = editingOrderSession[userId];
    if (text === "1")
      await sendEditingOrderForm(
        editSession.all_data_available,
        editSession.order_id,
        userId,
        client,
      );
    else if (text === "2") {
      const remainingOrder = deleteOrder(
        editSession.all_data_available,
        editSession.order_id,
      );
      if (!remainingOrder?.hasProducts) {
        delete pendingOrders[editSession.order_id];
        delete editingOrderSession[userId];
        await response.send(
          userId,
          "Pesanan dibatalkan karena tidak ada produk yang bisa diproses.",
        );
        return true;
      }
      await validationOrder(remainingOrder.data, userId, true, client);
      delete editingOrderSession[userId];
    } else if (text === "3") {
      await cancelOrder(editSession.order_id);
      await response.send(userId, "Silahkan ketik 'keluar'.");
    } else {
      delete editingOrderSession[userId];
      await extractionOrder(text, userId, true, client);
    }
    return true;
  }
  if (paymentStatus[userId]?.status) {
    await sendQrisPayment(userId, paymentStatus[userId].order_id);
    return true;
  }
  if (deliverySession[userId]) {
    const result = await handleDeliveryResponse(text, client);
    if (result?.message) await response.send(userId, result.message);
    return true;
  }
  switch (text) {
    case "1":
      userMode[userId] = "form";
      await response.send(
        userId,
        "📝 *JENIS PEMESANAN ANDA*\n===========================\n[1] Single Order\n[2] Multiple Order\n\n*_*Jika ingin kembali ke menu, ketik 'menu'_*",
      );
      return true;
    case "2":
      userMode[userId] = "faq";
      await response.send(
        userId,
        "🔍 *DAFTAR PERTANYAAN FAQ*\n=============================\n\n[1] KlikBi-Go Jual Apa Saja?\n\n[2] Bagaimana Cara Memesan?\n\n[3] Kapan Waktu Operasionalnya?\n\n[4] Apakah Pesanan Bisa Di Antar?\n\n[5] Metode Pembayarannya Apa Saja?\n\n*_Ketik 'menu' untuk kembali ke menu awal_*",
      );
      return true;
    case "3":
      userMode[userId] = "human-admin";
      await response.send(
        userId,
        "Terima kasih telah menghubungi, selanjutnya admin kami akan membantu kakak secara langsung 🙏🏻\n\nSilakan ajukan pertanyaan atau informasi yang ingin disampaikan.\n\n*_Ketik 'menu' untuk kembali ke chatbot_*",
      );
      return true;
    default:
      await response.send(
        userId,
        "Mohon maaf, sepertinya kakak memilih diluar pilihan yang ada.\n\nSilahkan pilih ulang menu kembali.",
      );
      return true;
  }
}
