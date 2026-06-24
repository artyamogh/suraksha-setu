document.addEventListener('DOMContentLoaded', () => {
        // Tab functionality
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                tab.classList.add('active');
                const tabId = tab.getAttribute('data-tab');
                document.getElementById(tabId).classList.add('active');
            });
        });

        // Sighting report modal
        const sightingModal = document.getElementById('sighting-modal');
        document.querySelectorAll('.sighting-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const personName = btn.getAttribute('data-person');
                document.getElementById('modal-person-name').textContent = personName;
                document.getElementById('sighting-person-name').value = personName;
                sightingModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        });

        // Volunteer modal
        const volunteerModal = document.getElementById('volunteer-modal');
        document.querySelectorAll('.volunteer-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const role = btn.getAttribute('data-role');
                document.getElementById('modal-role-name').textContent = role;

                let description = '';
                if (role === 'Search & Rescue') {
                    description = `<strong>Mission parameters:</strong> Ground searches in affected areas. <br><br><strong>Reqs:</strong> High physical fitness, safety compliance, readiness for extreme conditions.`;
                } else if (role === 'Family Support') {
                    description = `<strong>Mission parameters:</strong> Direct assistance and communication at relief centers. <br><br><strong>Reqs:</strong> Compassionate demeanor, confidentiality, crisis training preferred.`;
                } else {
                    description = `Please fill out the fast-track application for the <strong>${role}</strong> unit.`;
                }

                document.getElementById('role-description').innerHTML = description;
                volunteerModal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        });

        // Close modals
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                sightingModal.style.display = 'none';
                volunteerModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target === sightingModal) {
                sightingModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
            if (e.target === volunteerModal) {
                volunteerModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        document.getElementById('specific-volunteer-form').addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Application submitted! Standby for deployment instructions.');
            volunteerModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    });