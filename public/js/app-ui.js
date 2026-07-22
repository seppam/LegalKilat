/**
 * LegalKilat - Centralized UI Utilities (Modal, Toast, Inline Alert, Sidebar, Form Persistence)
 * Preserves strict Bahasa Indonesia formal design.
 */

(function () {
    // 1. Custom UI Modal Dialog Component
    window.showModal = function ({
        title = 'Konfirmasi Tindakan',
        message = 'Apakah Anda yakin ingin melanjutkan?',
        confirmText = 'Ya, Lanjutkan',
        cancelText = 'Batal',
        type = 'confirm', // 'confirm' | 'danger' | 'info'
        onConfirm = null,
        onCancel = null
    }) {
        const existingModal = document.getElementById('legalkilat-custom-modal');
        if (existingModal) existingModal.remove();

        const modalOverlay = document.createElement('div');
        modalOverlay.id = 'legalkilat-custom-modal';
        modalOverlay.className = 'fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity duration-200';

        const isDanger = type === 'danger';
        const confirmBtnColor = isDanger
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-[#24389C] hover:brightness-110 text-white';

        const iconHeader = isDanger
            ? '<span class="material-symbols-outlined text-red-600 text-2xl">warning</span>'
            : '<span class="material-symbols-outlined text-[#24389C] text-2xl">help_outline</span>';

        modalOverlay.innerHTML = `
            <div class="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full border border-slate-100 space-y-5 animate-scale-up">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${isDanger ? 'bg-red-50' : 'bg-indigo-50'} flex items-center justify-center shrink-0">
                        ${iconHeader}
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-slate-800">${title}</h3>
                        <p class="text-xs text-slate-400">LegalKilat Platform Confirmation</p>
                    </div>
                </div>
                
                <p class="text-xs text-slate-600 leading-relaxed font-medium">
                    ${message}
                </p>

                <div class="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button id="modal-cancel-btn" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition">
                        ${cancelText}
                    </button>
                    <button id="modal-confirm-btn" class="px-5 py-2.5 ${confirmBtnColor} rounded-xl font-bold text-xs transition shadow-md flex items-center gap-1.5">
                        <span>${confirmText}</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const cancelBtn = modalOverlay.querySelector('#modal-cancel-btn');
        const confirmBtn = modalOverlay.querySelector('#modal-confirm-btn');

        const closeModal = () => {
            modalOverlay.classList.add('opacity-0');
            setTimeout(() => modalOverlay.remove(), 150);
        };

        cancelBtn.addEventListener('click', () => {
            closeModal();
            if (typeof onCancel === 'function') onCancel();
        });

        confirmBtn.addEventListener('click', () => {
            closeModal();
            if (typeof onConfirm === 'function') onConfirm();
        });

        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
                if (typeof onCancel === 'function') onCancel();
            }
        });
    };

    // 2. Floating Toast Notification
    window.showToast = function (message, type = 'error', duration = 4000) {
        let container = document.getElementById('legalkilat-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'legalkilat-toast-container';
            container.className = 'fixed top-5 right-5 z-[2100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border transition-all duration-300 transform translate-x-10 opacity-0 bg-white';

        let iconName = 'error';
        let borderColor = 'border-red-200';
        let iconBg = 'bg-red-50 text-red-600';
        let titleText = 'Pemberitahuan Sistem';

        if (type === 'success') {
            iconName = 'check_circle';
            borderColor = 'border-green-200';
            iconBg = 'bg-green-50 text-green-700';
            titleText = 'Berhasil';
        } else if (type === 'info') {
            iconName = 'info';
            borderColor = 'border-indigo-200';
            iconBg = 'bg-indigo-50 text-[#24389C]';
            titleText = 'Informasi';
        } else {
            iconName = 'error';
            borderColor = 'border-red-200';
            iconBg = 'bg-red-50 text-red-600';
            titleText = 'Peringatan Sistem';
        }

        toast.classList.add(borderColor);
        toast.innerHTML = `
            <div class="w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center shrink-0 mt-0.5">
                <span class="material-symbols-outlined text-base font-bold">${iconName}</span>
            </div>
            <div class="flex-grow pr-2">
                <h4 class="text-xs font-bold text-slate-800">${titleText}</h4>
                <p class="text-xs text-slate-600 font-medium leading-relaxed mt-0.5">${message}</p>
            </div>
            <button class="toast-close-btn text-slate-400 hover:text-slate-600 transition shrink-0">
                <span class="material-symbols-outlined text-sm">close</span>
            </button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.remove('translate-x-10', 'opacity-0');
        }, 10);

        const removeToast = () => {
            toast.classList.add('translate-x-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        };

        toast.querySelector('.toast-close-btn').addEventListener('click', removeToast);
        setTimeout(removeToast, duration);
    };

    // 3. Inline Error Alert Banner Helper
    window.showInlineAlert = function (containerOrId, message, title = 'Peringatan Validasi') {
        let el = typeof containerOrId === 'string' ? document.getElementById(containerOrId) : containerOrId;
        if (!el) return;

        el.innerHTML = `
            <div class="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700 animate-fadeIn">
                <span class="material-symbols-outlined text-base font-bold shrink-0 mt-0.5">error</span>
                <div>
                    <strong class="font-bold block">${title}</strong>
                    <span class="font-semibold leading-relaxed">${message}</span>
                </div>
            </div>
        `;
        el.classList.remove('hidden');
    };

    // 4. Role-Based Sidebar Navigation Engine (Without Duplicated Bottom Logout Button)
    window.initLegalKilatSidebar = function ({ role = 'user', activePath = window.location.pathname }) {
        const sidebarContainer = document.getElementById('sidebar-container');
        if (!sidebarContainer) return;

        const isCollapsed = localStorage.getItem('legalkilat_sidebar_collapsed') === 'true';

        const userMenuItems = [
            { path: '/dashboard/index.html', label: 'Dashboard Utama', icon: 'dashboard' },
            { path: '/dashboard/kur.html', label: 'Pengajuan KUR', icon: 'account_balance' },
            { path: '/dashboard/ekspor.html', label: 'Kepatuhan Ekspor', icon: 'local_shipping' },
            { path: '/dashboard/chat.html', label: 'Asisten AI Chat', icon: 'smart_toy' },
            { path: '/dashboard/pratinjau.html', label: 'Pratinjau Dokumen', icon: 'description' },
            { path: '/dashboard/alur.html', label: 'Alur & Panduan', icon: 'alt_route' }
        ];

        const adminMenuItems = [
            { path: '/admin/ingestion.html', label: 'Ingesti Dokumen (Vector)', icon: 'upload_file' },
            { path: '/admin/simulator.html', label: 'Simulator RAG & Prompt', icon: 'psychology' }
        ];

        const menuItems = role === 'admin' ? adminMenuItems : userMenuItems;
        const brandTitle = role === 'admin' ? 'LKilat Control' : 'LegalKilat';
        const brandBadge = role === 'admin' ? 'ADMIN PANEL' : 'UMKM SUITE';
        const sidebarBgClass = role === 'admin' ? 'bg-[#0B1C30] text-white border-slate-800' : 'bg-white text-slate-800 border-slate-200';

        const buildSidebarHTML = (collapsed) => {
            const widthClass = collapsed ? 'w-16' : 'w-64';
            const toggleIcon = collapsed ? 'chevron_right' : 'chevron_left';

            let navLinksHTML = '';
            menuItems.forEach(item => {
                const isActive = activePath.endsWith(item.path) || (item.path === '/dashboard/index.html' && activePath.endsWith('/dashboard/'));
                let linkStyle = '';

                if (role === 'admin') {
                    linkStyle = isActive
                        ? 'bg-indigo-950 text-white font-bold border-l-4 border-indigo-400'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-semibold';
                } else {
                    linkStyle = isActive
                        ? 'bg-indigo-50 text-[#24389C] font-bold border-l-4 border-[#24389C]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#24389C] font-medium';
                }

                navLinksHTML += `
                    <a href="${item.path}" class="flex items-center gap-3.5 px-4 py-3.5 transition text-xs rounded-r-xl ${linkStyle}" title="${item.label}">
                        <span class="material-symbols-outlined text-xl shrink-0">${item.icon}</span>
                        ${collapsed ? '' : `<span class="sidebar-text-label truncate">${item.label}</span>`}
                    </a>
                `;
            });

            return `
                <aside id="legalkilat-sidebar" class="${sidebarBgClass} border-r shadow-xs transition-all duration-300 flex flex-col justify-between h-full sticky top-0 ${widthClass}">
                    <div>
                        <!-- Header Logo & Toggle -->
                        <div class="p-4 border-b border-slate-200/20 flex items-center justify-between h-16">
                            <div class="flex items-center gap-2 overflow-hidden">
                                <span class="material-symbols-outlined ${role === 'admin' ? 'text-indigo-400' : 'text-[#24389C]'} text-2xl font-bold shrink-0">gavel</span>
                                ${collapsed ? '' : `
                                    <div class="sidebar-text-label overflow-hidden">
                                        <span class="font-extrabold text-sm tracking-wide ${role === 'admin' ? 'text-white' : 'text-[#24389C]'} block leading-none">${brandTitle}</span>
                                        <span class="text-[9px] font-bold text-slate-400 block mt-1">${brandBadge}</span>
                                    </div>
                                `}
                            </div>
                            <button id="sidebar-toggle-btn" class="p-1.5 rounded-lg ${role === 'admin' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-600'} transition shrink-0" title="${collapsed ? 'Buka Sidebar' : 'Tutup Sidebar'}">
                                <span class="material-symbols-outlined text-lg">${toggleIcon}</span>
                            </button>
                        </div>

                        <!-- Nav List -->
                        <nav class="mt-4 space-y-1 px-2">
                            ${navLinksHTML}
                        </nav>
                    </div>

                    <!-- Footer Info (No Duplicated Logout Button) -->
                    <div class="p-3 border-t border-slate-200/20 text-[10px] text-slate-400 text-center">
                        ${collapsed ? '<span class="material-symbols-outlined text-xs">shield</span>' : `<p class="font-semibold truncate">LegalKilat Platform</p>`}
                    </div>
                </aside>
            `;
        };

        sidebarContainer.innerHTML = buildSidebarHTML(isCollapsed);

        // Bind Toggle Event
        sidebarContainer.addEventListener('click', (e) => {
            const toggleBtn = e.target.closest('#sidebar-toggle-btn');
            if (toggleBtn) {
                const nowCollapsed = localStorage.getItem('legalkilat_sidebar_collapsed') !== 'true';
                localStorage.setItem('legalkilat_sidebar_collapsed', nowCollapsed);
                sidebarContainer.innerHTML = buildSidebarHTML(nowCollapsed);
                window.dispatchEvent(new Event('resize'));
            }
        });
    };

    // 5. Automatic Form State Persistence Helper
    window.enableFormPersistence = function (containerOrFormId, storageKey) {
        const form = typeof containerOrFormId === 'string' ? document.getElementById(containerOrFormId) : containerOrFormId;
        if (!form) return;

        // Auto-restore saved values on load
        try {
            const savedData = JSON.parse(sessionStorage.getItem(storageKey) || '{}');
            Object.keys(savedData).forEach(fieldId => {
                const input = form.querySelector(`#${fieldId}`) || document.getElementById(fieldId);
                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = savedData[fieldId];
                    } else {
                        input.value = savedData[fieldId];
                    }
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        } catch (e) {
            console.warn('Gagal membaca state dari sessionStorage:', e);
        }

        // Auto-save on any change
        const saveState = () => {
            const dataToSave = {};
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.id) {
                    dataToSave[input.id] = input.type === 'checkbox' ? input.checked : input.value;
                }
            });
            sessionStorage.setItem(storageKey, JSON.stringify(dataToSave));
        };

        form.addEventListener('input', saveState);
        form.addEventListener('change', saveState);
    };
})();
