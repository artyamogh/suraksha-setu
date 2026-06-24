async function fetchNews() {
        const container = document.getElementById('news-container');
        try {
            const res = await fetch('/api/news');
            const data = await res.json();
            
            if (data.status === 'success' && data.news.length > 0) {
                container.innerHTML = '';
                
                // Group news day by day
                const groups = {};
                data.news.forEach(item => {
                    const d = new Date(item.pubDate);
                    // e.g. "Friday, April 18, 2026"
                    const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                    if (!groups[dateStr]) {
                        groups[dateStr] = [];
                    }
                    groups[dateStr].push(item);
                });
                
                // Icons to cycle through since we don't have images
                const icons = ['fa-globe-americas', 'fa-broadcast-tower', 'fa-bolt', 'fa-house-damage', 'fa-water', 'fa-wind', 'fa-fire'];
                let itemIndex = 0;
                
                Object.entries(groups).forEach(([dateStr, items]) => {
                    // Add Date Header spanning all columns
                    const header = document.createElement('div');
                    header.className = 'fade-in-up';
                    header.style.gridColumn = '1 / -1';
                    header.style.marginTop = itemIndex === 0 ? '0' : '1.5rem';
                    header.style.marginBottom = '0.5rem';
                    header.innerHTML = `
                        <h3 style="color: #1e293b; font-weight: 800; font-size: 1.5rem; border-bottom: 2px solid rgba(37,99,235,0.2); padding-bottom: 0.75rem;">
                            <i class="far fa-calendar-alt text-primary me-2"></i> ${dateStr}
                        </h3>
                    `;
                    container.appendChild(header);
                    
                    // Add Cards for this Date
                    items.forEach((item) => {
                        const icon = icons[itemIndex % icons.length];
                        const col = document.createElement('div');
                        col.className = 'fade-in-up';
                        col.style.animationDelay = `${(itemIndex % 6) * 0.1}s`;
                        
                        // Parse time for the card
                        const timeStr = new Date(item.pubDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        
                        col.innerHTML = `
                            <div class="news-card">
                                <div class="news-card-img-placeholder">
                                    <span class="news-badge">Alert</span>
                                    <i class="fas ${icon}"></i>
                                </div>
                                <div class="news-card-body">
                                    <h3 class="news-title">
                                        <a href="${item.link}" target="_blank" rel="noopener noreferrer">${item.title}</a>
                                    </h3>
                                    <div class="news-footer">
                                        <span class="news-date">
                                            <i class="far fa-clock"></i>
                                            ${timeStr}
                                        </span>
                                        <a href="${item.link}" target="_blank" class="news-read-more">
                                            Read Story <i class="fas fa-arrow-right"></i>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        `;
                        container.appendChild(col);
                        itemIndex++;
                    });
                });
            } else {
                container.innerHTML = `
                    <div class="col-12 text-center py-5" style="grid-column: 1 / -1; background: white; border-radius: 16px; border: 1px dashed #cbd5e1;">
                        <i class="fas fa-satellite-dish fa-3x mb-3" style="color: #94a3b8;"></i>
                        <h4 style="color: #0f172a; font-weight: 700;">No active news</h4>
                        <p style="color: #64748b;">There are no major alerts matching our criteria currently.</p>
                    </div>
                `;
            }
        } catch (err) {
            container.innerHTML = `
                <div class="col-12 text-center py-5" style="grid-column: 1 / -1; background: white; border-radius: 16px; border: 1px dashed #cbd5e1;">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3 opacity-75"></i>
                    <h4 style="color: #0f172a; font-weight: 700;">Failed to connect to feed</h4>
                    <button class="btn btn-primary mt-3" onclick="fetchNews()" style="border-radius: 8px; font-weight: 600;">Try Again</button>
                </div>
            `;
        }
    }
    
    // Simulate a slight delay so the loading skeletons show for effect
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(fetchNews, 800);
    });