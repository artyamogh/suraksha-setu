// Database for instant local results
    const servicesDB = [
        { name: "City General Hospital", type: "Medical", number: "108", distance: "1.2 km", status: "Open 24/7", icon: "fa-hospital", color: "var(--color-medical)" },
        { name: "National Disaster Response Force", type: "Rescue", number: "011-2436", distance: "3.5 km", status: "Active", icon: "fa-life-ring", color: "var(--color-rescue)" },
        { name: "Central Police Station", type: "Rescue", number: "100", distance: "0.8 km", status: "Open 24/7", icon: "fa-shield-alt", color: "var(--color-police)" },
        { name: "Community Safe Shelter", type: "Shelter", number: "1078", distance: "2.1 km", status: "Capacity: 65%", icon: "fa-home", color: "var(--color-shelter)" },
        { name: "Electricity Emergency Board", type: "Utilities", number: "1912", distance: "4.0 km", status: "Available", icon: "fa-bolt", color: "var(--color-utility)" },
        { name: "Municipal Relief Center", type: "Government", number: "1077", distance: "1.5 km", status: "Open", icon: "fa-university", color: "var(--color-govt)" },
        { name: "National Poison Control", type: "Medical", number: "1-800-222-1222", distance: "National", status: "24/7 Support", icon: "fa-skull-crossbones", color: "var(--color-medical)" }
    ];

    let currentCategory = 'All';
    let searchQuery = '';

    function renderResults() {
        const container = document.getElementById('results-container');
        container.innerHTML = '';

        const filtered = servicesDB.filter(s => {
            const matchesCategory = currentCategory === 'All' || s.type === currentCategory;
            const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  s.type.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 text-muted" style="background: white; border-radius: 1rem; border: 1px dashed #cbd5e1;">
                    <i class="fas fa-search fa-3x mb-3" style="color: #94a3b8;"></i>
                    <h5 style="color: #1e293b; font-weight: 700;">No services found</h5>
                    <p style="color: #64748b;">Try adjusting your search or category.</p>
                </div>
            `;
            return;
        }

        filtered.forEach((s, i) => {
            const card = document.createElement('div');
            card.className = 'contact-card fade-in-up';
            card.style.animationDelay = `${i * 0.05}s`;
            card.innerHTML = `
                <div class="contact-info">
                    <div class="contact-icon" style="background: ${s.color};">
                        <i class="fas ${s.icon}"></i>
                    </div>
                    <div class="contact-details">
                        <h4>${s.name}</h4>
                        <p>
                            <span class="status-dot"></span> ${s.status} 
                            <span class="ms-3"><i class="fas fa-location-arrow text-danger"></i> ${s.distance}</span>
                        </p>
                    </div>
                </div>
                <a href="tel:${s.number}" class="call-btn-circle" title="Call ${s.name}">
                    <i class="fas fa-phone-alt"></i>
                </a>
            `;
            container.appendChild(card);
        });
    }

    function setCategory(cat, element) {
        currentCategory = cat;
        document.querySelectorAll('.category-pill').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
        renderResults();
    }

    function filterResults() {
        searchQuery = document.getElementById('live-search').value;
        renderResults();
    }

    function detectLocation() {
        const btn = document.getElementById('location-btn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
        btn.style.pointerEvents = 'none';
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-check-circle"></i> Location Updated';
                    btn.style.background = '#dcfce7';
                    btn.style.color = '#16a34a';
                    
                    // Simulate real-time distance updates
                    servicesDB.forEach(s => {
                        if(s.distance.includes('km')) {
                            s.distance = (Math.random() * 4 + 0.5).toFixed(1) + ' km';
                        }
                    });
                    
                    renderResults();
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '';
                        btn.style.color = '';
                        btn.style.pointerEvents = 'auto';
                    }, 2500);
                }, 800);
            }, () => {
                btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Location Denied';
                btn.style.background = '#fee2e2';
                btn.style.color = '#dc2626';
                setTimeout(() => { 
                    btn.innerHTML = originalText; 
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.style.pointerEvents = 'auto';
                }, 2500);
            });
        } else {
            alert('Geolocation is not supported by your browser.');
            btn.innerHTML = originalText;
            btn.style.pointerEvents = 'auto';
        }
    }

    // Init
    document.addEventListener('DOMContentLoaded', () => {
        renderResults();
    });