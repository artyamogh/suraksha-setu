// Tab switching logic (exposed globally for inline onclick)
        function switchTab(targetId) {
            const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-target]');
            const tabSections = document.querySelectorAll('.tab-section');

            // Remove active class from all nav items and tabs
            navItems.forEach(item => item.classList.remove('active'));
            tabSections.forEach(tab => tab.classList.remove('active'));

            // Add active class to target tab and corresponding nav item
            const targetTab = document.getElementById(targetId);
            const targetNav = document.querySelector(`.sidebar-nav .nav-item[data-target="${targetId}"]`);

            if (targetTab && targetNav) {
                targetTab.classList.add('active');
                targetNav.classList.add('active');
                // Store in localStorage so it persists after page reload
                localStorage.setItem('activeAdminTab', targetId);
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const navItems = document.querySelectorAll('.sidebar-nav .nav-item[data-target]');

            // Add click listeners to nav items
            navItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    const targetId = item.getAttribute('data-target');
                    if (targetId) {
                        e.preventDefault();
                        switchTab(targetId);
                    }
                });
            });

            // Restore active tab from localStorage if exists
            const savedTab = localStorage.getItem('activeAdminTab');
            if (savedTab) {
                switchTab(savedTab);
            }
        });