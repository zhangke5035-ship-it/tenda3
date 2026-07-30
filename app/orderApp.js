import { createApp } from 'vue';
import 'element-plus/dist/index.css';
import OrderManagementApp from './OrderManagementApp.vue';

const mountEl = document.getElementById('vueOrderAppRoot');
if (mountEl) {
  createApp(OrderManagementApp).mount(mountEl);
}
