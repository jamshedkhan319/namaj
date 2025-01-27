// HTML সিলেক্টর
const tableBody = document.getElementById("prayer-times");
const locationElement = document.getElementById("location");
const countdownElement = document.getElementById("countdown");

// ১২-ঘণ্টার ফরম্যাটে সময় রূপান্তর ফাংশন
function convertTo12HourFormat(time) {
  const [hour, minute] = time.split(":");
  const hour12 = (hour % 12) || 12;
  const period = hour >= 12 ? "PM" : "AM";
  return `${hour12}:${minute} ${period}`;
}

// নোটিফিকেশন দেখানোর ফাংশন
function showNotification(title, message) {
  if (Notification.permission === "granted") {
    new Notification(title, { body: message });
  }
}

// কাউন্টডাউন এবং নোটিফিকেশন
function calculateCountdown(prayerTimes) {
  const now = new Date();
  for (const prayer of prayerTimes) {
    const [startHour, startMinute] = prayer.start.split(":").map(Number);
    const [endHour, endMinute] = prayer.end.split(":").map(Number);

    const prayerStartTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      startHour,
      startMinute
    );
    const prayerEndTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      endHour,
      endMinute
    );

    // যদি নামাজের সময় শুরু হতে বাকি থাকে
    if (prayerStartTime > now) {
      const diffInMs = prayerStartTime - now;
      const minutes = Math.floor(diffInMs / 60000);
      const seconds = Math.floor((diffInMs % 60000) / 1000);

      countdownElement.textContent = `পরবর্তী নামাজ (${prayer.name}) শুরু হতে ${minutes} মিনিট ${seconds} সেকেন্ড বাকি।`;

      // নামাজ শুরুর আগে নোটিফিকেশন
      setTimeout(() => {
        showNotification(
          `${prayer.name} নামাজের সময়`,
          `এখন ${prayer.name} নামাজের সময় শুরু হয়েছে।`
        );
      }, diffInMs);

      // নামাজ শেষ হওয়ার নোটিফিকেশন
      setTimeout(() => {
        showNotification(
          `${prayer.name} শেষ হয়েছে`,
          `${prayer.name} নামাজের সময় শেষ হয়েছে।`
        );
      }, diffInMs + (prayerEndTime - prayerStartTime));

      setTimeout(() => calculateCountdown(prayerTimes), 1000); // প্রতি সেকেন্ডে আপডেট
      return;
    }
  }

  countdownElement.textContent = "পরবর্তী নামাজের সময় গণনা করা হচ্ছে...";
}

// নামাজের সময় API কল করা
function fetchPrayerTimes(latitude, longitude) {
  const apiUrl = `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`;

  fetch(apiUrl)
    .then((response) => response.json())
    .then((data) => {
      const timings = data.data.timings;
      const location = data.data.meta.timezone;

      // নামাজের সময় এবং শেষ সময় নির্ধারণ
      const prayerTimes = [
        { name: "ফজর", start: timings.Fajr, end: timings.Dhuhr },
        { name: "জোহর", start: timings.Dhuhr, end: timings.Asr },
        { name: "আসর", start: timings.Asr, end: timings.Maghrib },
        { name: "মাগরিব", start: timings.Maghrib, end: timings.Isha },
        { name: "এশা", start: timings.Isha, end: "23:59" },
      ];

      // লোকেশন দেখানো
      locationElement.textContent = `আপনার অবস্থান: ${location}`;

      // টেবিল ক্লিয়ার করা
      tableBody.innerHTML = "";

      // নামাজের সময় টেবিলে যোগ করা
      prayerTimes.forEach((prayer) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${prayer.name}</td>
          <td>${convertTo12HourFormat(prayer.start)} - ${
          prayer.end !== "23:59"
            ? convertTo12HourFormat(prayer.end)
            : "রাত পর্যন্ত"
        }</td>
        `;
        tableBody.appendChild(row);
      });

      // কাউন্টডাউন শুরু করা
      calculateCountdown(prayerTimes);
    })
    .catch((error) => {
      console.error("ডেটা লোড করতে সমস্যা হয়েছে:", error);
      tableBody.innerHTML = `
        <tr>
          <td colspan="2">ডেটা লোড করতে সমস্যা হয়েছে।</td>
        </tr>
      `;
      countdownElement.textContent = "কাউন্টডাউন লোড করা সম্ভব হয়নি।";
    });
}

// ইউজারের লোকেশন বের করা
function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        fetchPrayerTimes(latitude, longitude); // লোকেশন দিয়ে API কল
      },
      (error) => {
        console.error("লোকেশন পাওয়া যায়নি:", error);
        locationElement.textContent = "আপনার লোকেশন পাওয়া যায়নি। দয়া করে জিপিএস চালু করুন।";
        tableBody.innerHTML = `
          <tr>
            <td colspan="2">লোকেশন ছাড়া নামাজের সময় দেখানো সম্ভব নয়।</td>
          </tr>
        `;
      }
    );
  } else {
    locationElement.textContent = "আপনার ব্রাউজার জিওলোকেশন সাপোর্ট করে না।";
    tableBody.innerHTML = `
      <tr>
        <td colspan="2">জিওলোকেশন সাপোর্ট নেই।</td>
      </tr>
    `;
  }
}

// নোটিফিকেশন অনুমোদন চেক
if (Notification.permission !== "granted") {
  Notification.requestPermission();
}

// স্ক্রিপ্ট লোড হওয়ার সাথে সাথে লোকেশন পাওয়া শুরু হবে
getUserLocation();
