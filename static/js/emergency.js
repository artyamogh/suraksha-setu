// --- KIT DATA ---
    const kitData = {
        base: {
            "Water & Food": [
                "Bottled water (1 gallon/person/day) - 3 Day Supply",
                "Non-perishable food (Canned goods, dry fruits)",
                "Manual can opener",
                "Baby food / dietary items"
            ],
            "First Aid & Health": [
                "Pro First aid kit (bandages, antiseptic)",
                "Prescription medications (7-day)",
                "Pain relievers (Paracetamol/Ibuprofen)",
                "Hygiene supplies (Soap, sanitizer)"
            ],
            "Tools & Supplies": [
                "Flashlight with extra batteries",
                "Multi-purpose tool / Knife",
                "Whistle (to signal for help)",
                "Portable power bank",
                "Offline local maps"
            ]
        },
        Coastal: {
            "Water & Food": ["Waterproof containers for dry food"],
            "Tools & Supplies": ["Life jackets for all members", "Waterproof document bag", "Emergency flares"]
        },
        Earthquake: {
            "Tools & Supplies": ["Sturdy work gloves", "Dust masks (N95)", "Goggles / Eye protection", "Crowbar"]
        },
        Flood: {
            "Tools & Supplies": ["Sandbags", "Water purification tablets", "Rain gear / Ponchos"]
        },
        Urban: {
            "Tools & Supplies": ["Cash in small denominations", "City map marked with routes", "Dust mask"]
        },
        Suburban: {
            "Tools & Supplies": ["Battery powered radio", "Wrench/Pliers for utilities"]
        },
        Rural: {
            "Tools & Supplies": ["Compass and signal mirror", "Thermal blankets", "Rope (50 ft)", "Matches"]
        }
    };

    let currentKitItems = [];

    document.addEventListener('DOMContentLoaded', () => {
        const locationSelect = document.getElementById('location');
        const savedLocation = localStorage.getItem('selectedLocation');
        
        if (savedLocation) {
            locationSelect.value = savedLocation;
            renderKit(savedLocation);
        } else {
            renderKit('');
        }

        locationSelect.addEventListener('change', (e) => {
            const loc = e.target.value;
            localStorage.setItem('selectedLocation', loc);
            renderKit(loc);
        });
    });

    function renderKit(location) {
        const container = document.getElementById('checklist-container');
        container.innerHTML = '';
        currentKitItems = [];

        const categories = ["Water & Food", "First Aid & Health", "Tools & Supplies"];

        categories.forEach(cat => {
            let items = [...kitData.base[cat]];
            if (location && kitData[location] && kitData[location][cat]) {
                items = [...items, ...kitData[location][cat]];
            }

            const catDiv = document.createElement('div');
            catDiv.className = 'checklist-card';

            let itemsHtml = items.map((item, index) => {
                const uniqueId = `${cat.replace(/[^a-zA-Z]/g, '')}-${index}`;
                currentKitItems.push(item);
                const isChecked = localStorage.getItem(item) === 'true' ? 'checked' : '';
                
                // Add a visual badge if this item is specific to the selected location
                let badgeHtml = '';
                if (location && kitData[location] && kitData[location][cat] && kitData[location][cat].includes(item)) {
                    badgeHtml = `<span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; margin-left: 8px; font-weight: 700; border: 1px solid #bfdbfe;">${location}</span>`;
                }

                return `
                    <div class="checklist-item" onclick="document.getElementById('${uniqueId}').click()">
                        <input type="checkbox" id="${uniqueId}" ${isChecked} onclick="event.stopPropagation(); toggleItem('${item}', this.checked)">
                        <label for="${uniqueId}" style="display:flex; align-items:center; flex-wrap:wrap;">
                            <span>${item}</span>
                            ${badgeHtml}
                        </label>
                    </div>
                `;
            }).join('');

            catDiv.innerHTML = `
                <h3>${getIconForCategory(cat)} ${cat}</h3>
                <div class="checklist-items-container">
                    ${itemsHtml}
                </div>
            `;
            container.appendChild(catDiv);
        });

        // Initialize progress
        updateProgress();
    }

    function getIconForCategory(cat) {
        if (cat.includes("Water")) return '<i class="fas fa-bottle-water"></i>';
        if (cat.includes("Health")) return '<i class="fas fa-first-aid"></i>';
        return '<i class="fas fa-tools"></i>';
    }

    function toggleItem(itemName, isChecked) {
        localStorage.setItem(itemName, isChecked);
        updateProgress();
    }

    function updateProgress() {
        const checkboxes = document.querySelectorAll('.checklist-item input[type="checkbox"]');
        if(checkboxes.length === 0) return;
        const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
        const percent = Math.round((checked / checkboxes.length) * 100);
        
        const fill = document.getElementById('progressBar');
        const text = document.getElementById('progressText');
        
        if(fill && text) {
            fill.style.width = `${percent}%`;
            text.innerText = `${percent}%`;
            if (percent === 100) {
                fill.style.background = '#10b981'; // Green
                text.style.color = '#10b981';
            } else {
                fill.style.background = 'var(--saas-primary)';
                text.style.color = 'var(--saas-primary)';
            }
        }
    }

    // Modal Logic
    function openSaveModal() { document.getElementById('saveKitModal').style.display = 'flex'; }
    function closeSaveModal() { document.getElementById('saveKitModal').style.display = 'none'; }
    
    function emailKitList(e) {
        e.preventDefault();
        const email = e.target.email.value;
        const location = document.getElementById('location').value || 'General';
        const btn = e.target.querySelector('button');
        
        btn.innerText = 'Sending...';
        btn.disabled = true;

        fetch('/email_kit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, location, items: currentKitItems })
        })
        .then(res => res.json())
        .then(data => {
            btn.innerText = 'Send to Email';
            btn.disabled = false;
            const status = document.getElementById('saveStatus');
            status.style.display = 'block';
            if (data.status === 'success') {
                status.innerText = '✔ Sent successfully!';
                status.style.color = '#10b981';
                setTimeout(closeSaveModal, 2000);
            } else {
                status.innerText = '❌ Error sending.';
                status.style.color = '#ef4444';
            }
        })
        .catch(err => {
            console.error(err);
            btn.innerText = 'Send to Email';
            btn.disabled = false;
        });
    }

    let currentProduct = {};
    function openBuyModal(name, price) {
        currentProduct = { name, price };
        document.getElementById('modalProductName').innerText = name;
        document.getElementById('modalPrice').innerText = '₹' + price;
        document.getElementById('buyModal').style.display = 'flex';
    }
    function closeBuyModal() {
        document.getElementById('buyModal').style.display = 'none';
        document.getElementById('purchaseForm').reset();
    }

    function processOrder(e) {
        e.preventDefault();
        const btn = document.getElementById('confirmBtn');
        const form = e.target;
        
        btn.innerText = 'Processing...';
        btn.disabled = true;

        fetch('/process_order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                product_name: currentProduct.name,
                price: currentProduct.price,
                customer_name: form.customerName.value,
                contact_info: form.contactInfo.value
            })
        })
        .then(res => res.json())
        .then(data => {
            closeBuyModal();
            btn.innerText = 'Confirm Purchase';
            btn.disabled = false;
            if (data.status === 'success') {
                document.getElementById('successProduct').innerText = currentProduct.name;
                new bootstrap.Modal(document.getElementById('orderSuccessModal')).show();
            } else {
                alert('Order failed: ' + data.message);
            }
        })
        .catch(err => {
            console.error(err);
            btn.innerText = 'Confirm Purchase';
            btn.disabled = false;
            alert('Something went wrong.');
        });
    }

    window.onclick = function (e) {
        if (e.target == document.getElementById('buyModal')) closeBuyModal();
        if (e.target == document.getElementById('saveKitModal')) closeSaveModal();
    }