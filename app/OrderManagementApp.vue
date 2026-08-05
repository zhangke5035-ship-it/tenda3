<template>
  <div class="order-management-container">
    <!-- 顶部指标卡片 -->
    <el-row :gutter="20" class="data-overview-row">
      <el-col :span="8">
        <el-card shadow="hover" class="metric-card">
          <div class="card-icon icon-total"><el-icon><Document /></el-icon></div>
          <div class="card-info">
            <span class="card-label">订单总数</span>
            <div class="card-value">{{ orders.length }} <span class="card-unit">单</span></div>
            <span class="card-desc">{{ orders.length ? ('累计 ' + orders.length + ' 单') : '暂无订单' }}</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="metric-card">
          <div class="card-icon icon-amount"><el-icon><Money /></el-icon></div>
          <div class="card-info">
            <span class="card-label">订单总金额</span>
            <div class="card-value font-mono">{{ totalAmountSum.toFixed(1) }} <span class="card-unit">zł</span></div>
            <span class="card-desc">按各订单型号明细汇总</span>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card shadow="hover" class="metric-card">
          <div class="card-icon icon-pending"><el-icon><Clock /></el-icon></div>
          <div class="card-info">
            <span class="card-label">待处理订单</span>
            <div class="card-value" :class="{ 'text-warning': pendingCount > 0 }">{{ pendingCount }} <span class="card-unit">单</span></div>
            <span class="card-desc">尚未发货的订单数</span>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 新增订单 + 筛选 + 表格 -->
    <el-card class="main-content-card" shadow="never" v-loading="loading">
      <div class="table-header-toolbar">
        <el-button type="primary" size="large" @click="openDrawer">
          <el-icon><Plus /></el-icon>新增订单
        </el-button>

        <div class="filter-controls">
          <el-select
            v-model="filterCustomer"
            placeholder="全部客户"
            clearable
            style="width: 220px; margin-right: 16px;"
          >
            <el-option
              v-for="c in customerOptions"
              :key="c.value"
              :label="c.label"
              :value="c.value"
            />
          </el-select>
          <el-radio-group v-model="filterStatus" size="default">
            <el-radio-button label="全部">全部 ({{ statusCounts['全部'] }})</el-radio-button>
            <el-radio-button label="待处理">待处理 ({{ statusCounts['待处理'] }})</el-radio-button>
            <el-radio-button label="已发货">已发货 ({{ statusCounts['已发货'] }})</el-radio-button>
            <el-radio-button label="已完成">已完成 ({{ statusCounts['已完成'] }})</el-radio-button>
            <el-radio-button label="已取消">已取消 ({{ statusCounts['已取消'] }})</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <el-table
        :data="pagedTableData"
        stripe
        row-key="id"
        class="order-data-table"
        :header-cell-style="{ background: '#f8fafc', color: '#475569', fontWeight: '600' }"
      >
        <el-table-column prop="no" label="订单号" align="left" min-width="120" class-name="font-mono" />

        <el-table-column label="客户订单号" align="left" min-width="160">
          <template #default="scope">
            <el-input
              v-model="scope.row.poNoteDisplay"
              placeholder="Note: ..."
              size="small"
              @blur="savePoNote(scope.row)"
            />
          </template>
        </el-table-column>

        <el-table-column prop="date" label="下单日期" align="left" width="120" />

        <el-table-column label="客户" align="left" min-width="160">
          <template #default="scope">{{ customerName(scope.row.cust) }}</template>
        </el-table-column>

        <el-table-column label="型号数" align="right" width="100">
          <template #default="scope">
            <span class="font-mono">{{ itemCount(scope.row.id) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="订单总额(PLN)" align="right" min-width="140">
          <template #default="scope">
            <span class="font-mono text-bold">{{ orderTotal(scope.row.id).toFixed(1) }} zł</span>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" align="center" width="120">
          <template #default="scope">
            <el-tag :type="getStatusTagType(scope.row.status)" effect="light" class="status-badge">
              {{ scope.row.status }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" align="center" width="120">
          <template #default="scope">
            <el-button type="primary" link size="small" @click="viewDetail(scope.row.id)">详情</el-button>
            <el-button type="danger" link size="small" @click="deleteOrder(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredOrders.length"
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
        />
      </div>
    </el-card>

    <!-- 新增订单抽屉 -->
    <el-drawer v-model="isDrawerOpen" title="创建新订单" direction="rtl" size="460px" destroy-on-close>
      <el-form ref="formRef" :model="form" :rules="formRules" label-position="top" class="new-order-form">
        <el-form-item label="订单号" prop="no">
          <el-input v-model="form.no" placeholder="例如 PL-20260714-001" />
        </el-form-item>
        <el-form-item label="客户订单号" prop="poNote">
          <el-input v-model="form.poNote" placeholder="例如 Note: ZZ000021332" />
        </el-form-item>
        <el-form-item label="客户" prop="cust">
          <el-select v-model="form.cust" placeholder="请选择客户" style="width: 100%;">
            <el-option v-for="c in customerOptions" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="下单日期" prop="date">
          <el-date-picker v-model="form.date" type="date" placeholder="选择日期" style="width: 100%;" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="form.status" style="width: 100%;">
            <el-option label="待处理" value="待处理" />
            <el-option label="已发货" value="已发货" />
            <el-option label="已完成" value="已完成" />
            <el-option label="已取消" value="已取消" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="drawer-footer">
          <el-button @click="isDrawerOpen = false">取消</el-button>
          <el-button type="primary" :loading="submitting" @click="handleSubmit">确认创建</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Document, Money, Clock, Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// ---- 复用主应用已初始化的 Supabase 客户端 + 客户字典（见 index.html 中的 window.sb / window.CUSTOMERS 暴露） ----
const sb = window.sb
const CUSTOMERS = window.CUSTOMERS || {}

const customerOptions = computed(() =>
  Object.keys(CUSTOMERS).map((code) => ({ value: code, label: CUSTOMERS[code].name }))
)
function customerName(code) {
  return CUSTOMERS[code] ? CUSTOMERS[code].name : (code || '')
}

// ---- 状态 ----
const loading = ref(false)
const submitting = ref(false)
const orders = ref([])
const orderItems = ref([])
const filterCustomer = ref('')
const filterStatus = ref('全部')
const page = ref(1)
const pageSize = ref(10)

// ---- 抽屉/表单 ----
const isDrawerOpen = ref(false)
const formRef = ref()
const form = ref({ no: '', poNote: '', cust: '', date: '', status: '待处理' })
const formRules = {
  no: [{ required: true, message: '请输入订单号', trigger: 'blur' }],
  cust: [{ required: true, message: '请选择客户', trigger: 'change' }],
  date: [{ required: true, message: '请选择下单日期', trigger: 'change' }],
  poNote: [{ max: 100, message: '客户订单号长度不能超过 100 个字符', trigger: 'blur' }],
}

// ---- 数据加载 ----
async function fetchData() {
  loading.value = true
  try {
    const [ordersRes, itemsRes] = await Promise.all([
      sb.from('orders').select('*').order('order_date', { ascending: false }),
      sb.from('order_items').select('*').order('id', { ascending: true }),
    ])
    if (ordersRes.error) { console.error('fetch orders', ordersRes.error); ElMessage.error('加载订单失败：' + ordersRes.error.message) }
    if (itemsRes.error) { console.error('fetch order_items', itemsRes.error) }
    orders.value = (ordersRes.data || []).map((r) => ({
      id: r.id,
      no: r.order_no,
      cust: r.cust,
      date: r.order_date || '',
      status: r.status,
      poNote: r.customer_po_note || '',
      poNoteDisplay: extractCustomerOrderNo(r.customer_po_note),
    }))
    orderItems.value = (itemsRes.data || []).map((r) => ({
      id: r.id, orderId: r.order_id, qty: Number(r.qty) || 0, price: Number(r.price) || 0,
    }))
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

function extractCustomerOrderNo(note) {
  if (!note) return ''
  return String(note).replace(/^\s*note\s*[:：]\s*/i, '').trim()
}

function itemCount(orderId) {
  return orderItems.value.filter((i) => i.orderId === orderId).length
}
function orderTotal(orderId) {
  return orderItems.value
    .filter((i) => i.orderId === orderId)
    .reduce((s, i) => s + i.qty * i.price, 0)
}

// ---- 筛选 ----
const filteredOrders = computed(() => {
  return orders.value.filter((o) => {
    const matchCustomer = !filterCustomer.value || o.cust === filterCustomer.value
    const matchStatus = filterStatus.value === '全部' || o.status === filterStatus.value
    return matchCustomer && matchStatus
  })
})
const pagedTableData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredOrders.value.slice(start, start + pageSize.value)
})

const totalAmountSum = computed(() => orders.value.reduce((s, o) => s + orderTotal(o.id), 0))
const pendingCount = computed(() => orders.value.filter((o) => o.status === '待处理').length)

const statusCounts = computed(() => {
  const base = filterCustomer.value
    ? orders.value.filter((o) => o.cust === filterCustomer.value)
    : orders.value
  return {
    '全部': base.length,
    '待处理': base.filter((o) => o.status === '待处理').length,
    '已发货': base.filter((o) => o.status === '已发货').length,
    '已完成': base.filter((o) => o.status === '已完成').length,
    '已取消': base.filter((o) => o.status === '已取消').length,
  }
})

function getStatusTagType(status) {
  switch (status) {
    case '已发货': return 'success'
    case '待处理': return 'warning'
    case '已完成': return 'info'
    case '已取消': return 'danger'
    default: return 'primary'
  }
}

// ---- 保存客户订单号（行内编辑，失焦保存） ----
async function savePoNote(row) {
  const rawVal = (row.poNoteDisplay || '').trim()
  const { error } = await sb.from('orders').update({ customer_po_note: rawVal || null }).eq('id', row.id)
  if (error) {
    ElMessage.error('保存客户订单号失败：' + error.message)
    return
  }
  row.poNote = rawVal
  row.poNoteDisplay = extractCustomerOrderNo(rawVal)
  window.loadOrdersData && window.loadOrdersData()
}

// ---- 新增订单 ----
function openDrawer() {
  form.value = { no: '', poNote: '', cust: '', date: '', status: '待处理' }
  formRef.value?.clearValidate()
  isDrawerOpen.value = true
}

function handleSubmit() {
  formRef.value?.validate(async (valid) => {
    if (!valid) return
    submitting.value = true
    try {
      const { data, error } = await sb
        .from('orders')
        .insert({
          order_no: form.value.no,
          cust: form.value.cust,
          order_date: form.value.date || null,
          status: form.value.status,
          customer_po_note: form.value.poNote.trim() || null,
        })
        .select()
        .single()
      if (error) {
        ElMessage.error('保存订单失败：' + error.message)
        return
      }
      orders.value.push({
        id: data.id,
        no: data.order_no,
        cust: data.cust,
        date: data.order_date || '',
        status: data.status,
        poNote: data.customer_po_note || '',
        poNoteDisplay: extractCustomerOrderNo(data.customer_po_note),
      })
      ElMessage.success('订单创建成功')
      isDrawerOpen.value = false
      window.loadOrdersData && window.loadOrdersData()
    } finally {
      submitting.value = false
    }
  })
}

// ---- 删除订单 ----
async function deleteOrder(row) {
  try {
    await ElMessageBox.confirm(`确定删除订单 ${row.no} 吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch (e) {
    return // 用户取消
  }
  const { error } = await sb.from('orders').delete().eq('id', row.id)
  if (error) {
    ElMessage.error('删除订单失败：' + error.message)
    return
  }
  orders.value = orders.value.filter((o) => o.id !== row.id)
  orderItems.value = orderItems.value.filter((i) => i.orderId !== row.id)
  ElMessage.success('已删除')
  window.loadOrdersData && window.loadOrdersData()
}

// ---- 查看详情：复用主应用现有的订单明细面板 ----
function viewDetail(id) {
  if (typeof window.openOrderDetail === 'function') {
    window.openOrderDetail(id)
  }
}
</script>

<style scoped>
.order-management-container {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
.data-overview-row { margin-bottom: 20px; }
.metric-card { border-radius: 12px; border: none; }
.metric-card :deep(.el-card__body) { display: flex; align-items: center; padding: 20px; }
.card-icon {
  width: 52px; height: 52px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; margin-right: 16px;
}
.icon-total { background-color: #e0f2fe; color: #0284c7; }
.icon-amount { background-color: #dcfce7; color: #16a34a; }
.icon-pending { background-color: #ffedd5; color: #ea580c; }
.card-info { display: flex; flex-direction: column; }
.card-label { font-size: 13px; color: #64748b; margin-bottom: 4px; }
.card-value { font-size: 24px; font-weight: 700; color: #1e293b; line-height: 1.2; }
.card-unit { font-size: 13px; font-weight: 400; color: #94a3b8; margin-left: 4px; }
.card-desc { font-size: 12px; color: #94a3b8; margin-top: 4px; }
.main-content-card { border-radius: 12px; border: none; }
.table-header-toolbar {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;
}
.filter-controls { display: flex; align-items: center; flex-wrap: wrap; }
.font-mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; }
.text-bold { font-weight: 600; }
.text-warning { color: #ea580c !important; }
.status-badge { font-weight: 600; padding: 4px 12px; border-radius: 6px; }
.pagination-container { display: flex; justify-content: flex-end; margin-top: 20px; }
.drawer-footer { display: flex; justify-content: flex-end; gap: 12px; }
</style>
