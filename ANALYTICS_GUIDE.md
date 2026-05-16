# 📊 Analytics System Implementation Guide

## ✅ What's Been Done

### 1. **Analytics APIs (Backend)**
تم إنشاء 4 APIs تحليلية متخصصة:

#### `GET /api/analytics/performance` (الأداء)
```bash
# في آخر 30 يوم
curl "http://localhost:3003/api/analytics/performance?days=30"
```
**يعيد:**
- إجمالي الطلبات ✓
- عدد الطلبات المكتملة ✓
- الطلبات الملغاة ✓
- متوسط وقت الإنجاز ✓
- معدل الإنجاز في الوقت المحدد (SLA) ✓
- توزيع الحالات (Draft, New, On Hold, etc) ✓
- توزيع الوحدات (Shipping, HR, etc) ✓
- أداء كل وحدة بالتفصيل ✓

#### `GET /api/analytics/trends` (الاتجاهات)
```bash
# آخر 90 يوم
curl "http://localhost:3003/api/analytics/trends?days=90"
```
**يعيد:**
- تطور يومي للطلبات ✓
- معدل الإنجاز الشهري ✓
- اتجاهات الوحدات (Module Trends) ✓

#### `GET /api/analytics/resources` (استخدام الموارد)
```bash
curl "http://localhost:3003/api/analytics/resources?days=30"
```
**يعيد:**
- إحصائيات المستخدمين (عدد الطلبات، الحمل) ✓
- توزيع الأدوار (Roles) ✓
- أكثر المستخدمين حملاً (Top Loaded Users) ✓

#### `GET /api/analytics/export` (التصدير)
```bash
# تصدير CSV
curl "http://localhost:3003/api/analytics/export?format=csv&days=30"

# تصدير JSON
curl "http://localhost:3003/api/analytics/export?format=json&days=30"
```

---

### 2. **Analytics Frontend Page** 📊
**المسار:** `http://localhost:3003/analytics`

#### المكونات:
1. **Performance Metrics Card**
   - Total Requests, Completed, Resolution Time, On-Time Rate
   
2. **Status & Module Distribution Charts**
   - Pie Chart: توزيع الحالات
   - Bar Chart: توزيع الوحدات

3. **Daily & Monthly Trends**
   - Line Chart: تطور الطلبات اليومي
   - Line Chart: معدل الإنجاز الشهري

4. **Resources & Load Analysis**
   - Role Distribution (Bar Chart)
   - Top Loaded Users (List with ranking)
   - Performance by Module (Cards)

5. **Export Options**
   - 📥 Download CSV button
   - JSON export ready

#### Features:
- ✅ 7, 30, 60, 90 days views
- ✅ Real-time data refresh
- ✅ Responsive design
- ✅ Color-coded charts
- ✅ Trend indicators

---

### 3. **Sidebar Integration** 🧭
في `src/components/layout/Sidebar.tsx`:
- أضيف عنصر جديد: **Analytics** (مع أيقونة 📊)
- الصلاحيات: super_admin, admin, manager فقط
- يظهر تحت "All Requests"

---

### 4. **Utilities & Configuration** 🛠️

#### `src/lib/analytics-api.ts`
مكتبة كاملة لجلب البيانات:
```typescript
import {
  fetchPerformanceMetrics,
  fetchTrendsData,
  fetchResourcesData,
  downloadAnalyticsReport,
} from "@/lib/analytics-api"

// استخدام:
const metrics = await fetchPerformanceMetrics(30)
const trends = await fetchTrendsData(90)
```

#### `src/lib/analytics-config.ts`
إعدادات الميزات مع خيارات تفعيل/تعطيل:
```typescript
// تفعيل ميزات تحليلية محددة
ANALYTICS_FEATURES.performance.enabled = true
ANALYTICS_FEATURES.trends.enabled = true
ANALYTICS_FEATURES.resources.enabled = true
```

---

## 🚀 How to Use

### 1. **الوصول للصفحة**
```
http://localhost:3003/analytics
```

### 2. **تغيير الفترة الزمنية**
استخدم القائمة المنسدلة العلوية:
- Last 7 days
- Last 30 days
- Last 60 days
- Last 90 days

### 3. **تصدير البيانات**
انقر على زر "Export CSV" لتحميل التقرير

### 4. **الوصول عبر API**
```bash
# Get performance metrics for last 30 days
curl -X GET "http://localhost:3003/api/analytics/performance?days=30"

# Get trends for last 90 days
curl -X GET "http://localhost:3003/api/analytics/trends?days=90"

# Export as CSV
curl -X GET "http://localhost:3003/api/analytics/export?format=csv&days=30" \
  -H "Accept: text/csv"
```

---

## 📈 ما الذي سيتم تحسينه تدريجياً

### Phase 2 (Coming Soon):
- ✨ Predictions & Forecasting
- 📅 Advanced date range picker
- 🎯 Custom metric builder
- 📧 Email report scheduling
- 📱 Mobile-optimized views
- 🔔 Alerts & notifications

### Phase 3:
- 🤖 AI-powered insights
- 📊 Custom dashboards per role
- 🔐 Data access controls
- 📉 Anomaly detection

---

## 🔧 Technical Stack

```
Backend:
├── Next.js API Routes (Node.js runtime)
├── Prisma ORM (PostgreSQL)
└── Date calculations & aggregations

Frontend:
├── React 19 + TypeScript
├── Recharts (charts & visualizations)
├── Framer Motion (animations)
├── Tailwind CSS (styling)
└── Next.js App Router

APIs:
├── /api/analytics/performance
├── /api/analytics/trends
├── /api/analytics/resources
└── /api/analytics/export
```

---

## 📝 Database Queries Structure

جميع البيانات مأخوذة من جدول `Request` الموجود:
```typescript
const requests = await prisma.request.findMany({
  where: { createdAt: { gte: startDate } },
  include: { requester: true }
})
```

لا تحتاج لإضافة جداول جديدة! 🎉

---

## 💡 Configuration Examples

### تفعيل/تعطيل ميزات محددة:
```typescript
// في src/lib/analytics-config.ts

export const ANALYTICS_FEATURES = {
  performance: { enabled: true },   // فعّال
  trends: { enabled: true },        // فعّال
  resources: { enabled: true },     // فعّال
  export: { csv: true, json: true }, // فعّال
}
```

### تغيير فترة التحديث:
```typescript
performance: {
  enabled: true,
  refreshInterval: 300000 // كل 5 دقائق
}
```

---

## 🧪 Testing

```bash
# Build the project
npm run build

# Run dev server
npm run dev

# Navigate to
http://localhost:3003/analytics
```

---

## 📊 Metrics Being Tracked

| Metric | Description | Source |
|--------|-------------|--------|
| Total Requests | عدد الطلبات الكلي | COUNT(*) |
| Completed | طلبات مكتملة | status = 'completed' |
| On-Time Rate | معدل الإنجاز في الوقت | days_to_complete ≤ 5 |
| Avg Resolution | متوسط وقت الإنجاز | AVG(completed_date - created_date) |
| Module Distribution | توزيع حسب الوحدة | GROUP BY module |
| User Load | حمل المستخدم | COUNT by requester_id |
| Role Distribution | توزيع الأدوار | GROUP BY user.role |
| Status Breakdown | توزيع الحالات | GROUP BY status |

---

## 🎯 Next Steps (للتطوير اللاحق)

1. **إضافة Predictions:**
   - استخدام الاتجاهات السابقة للتنبؤ بالطلبات القادمة
   - تحذيرات من الاختناقات المتوقعة

2. **تحسين Dashboard:**
   - إضافة نقاط drill-down (الضغط على البيانات للتفاصيل)
   - مقارنة فترات زمنية مختلفة

3. **تقارير مجدولة:**
   - إرسال تقارير تلقائية عبر البريد الإلكتروني
   - جدولة التقارير أسبوعياً أو شهرياً

4. **لوحات بيانات مخصصة:**
   - لكل دور (Manager, Admin, etc)
   - حفظ التفضيلات

5. **تنبيهات ذكية:**
   - تعديات SLA
   - أنماط غير عادية
   - انقطاعات الخدمة

---

## 📞 Support

اذا واجهت أي مشكلة:
1. تحقق من API endpoint صحيح
2. تأكد من أن البيانات موجودة في قاعدة البيانات
3. افحص browser console للأخطاء
4. تحقق من permissions الدور الحالي
