function showTips(disasterType) {
        const tipsSection = document.getElementById('protectionTips');
        let title = '';
        let tipsHTML = '';

        switch (disasterType) {
            case 'earthquake':
                title = 'Earthquake Protection Tips';
                tipsHTML = `
                    <h2>${title}</h2>
                    <div class="tip-category">
                        <h3>Structural Safety</h3>
                        <div class="tip-item">
                            <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                            <div class="tip-content">
                                <h4>Secure Heavy Furniture</h4>
                                <p>Anchor bookcases, cabinets, and appliances to wall studs</p>
                            </div>
                        </div>
                        <div class="tip-item">
                            <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                            <div class="tip-content">
                                <h4>Brace Overhead Fixtures</h4>
                                <p>Secure light fixtures, ceiling fans, and other hanging items</p>
                            </div>
                        </div>
                    </div>
                     <div class="tip-category">
                        <h3>Emergency Preparedness</h3>
                        <div class="tip-item">
                            <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                            <div class="tip-content">
                                <h4>Identify Safe Spots</h4>
                                <p>Know where to take cover in each room</p>
                            </div>
                        </div>
                    </div>`;
                break;

            case 'flood':
                title = 'Flood Protection Tips';
                tipsHTML = `
                    <h2>${title}</h2>
                    <div class="tip-category">
                        <h3>Prevention</h3>
                        <div class="tip-item">
                            <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                            <div class="tip-content">
                                <h4>Elevate Utilities</h4>
                                <p>Raise electrical panels, sockets, and appliances above potential flood levels</p>
                            </div>
                        </div>
                        <div class="tip-item">
                            <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                            <div class="tip-content">
                                <h4>Install Backflow Valves</h4>
                                <p>Prevent sewage backup into your home</p>
                            </div>
                        </div>
                    </div>`;
                break;

            case 'fire':
                title = 'Wildfire Protection Tips';
                tipsHTML = `
                    <h2>${title}</h2>
                    <div class="tip-category">
                        <h3>Create Defensible Space</h3>
                        <div class="tip-item">
                            <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                            <div class="tip-content">
                                <h4>Clear Vegetation</h4>
                                <p>Remove dead plants, grass, and weeds within 30 feet of your home.</p>
                            </div>
                        </div>
                         <div class="tip-item">
                             <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                             <div class="tip-content">
                                 <h4>Clean Roof & Gutters</h4>
                                 <p>Remove leaves, needles, and debris that could catch fire from embers.</p>
                             </div>
                         </div>
                    </div>`;
                break;

            case 'hurricane':
                title = 'Hurricane Protection Tips';
                tipsHTML = `
                    <h2>${title}</h2>
                    <div class="tip-category">
                        <h3>Reinforce Your Home</h3>
                        <div class="tip-item">
                            <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                            <div class="tip-content">
                                <h4>Install Storm Shutters</h4>
                                <p>Protect windows from breaking, or have plywood ready to board them up.</p>
                            </div>
                        </div>
                        <div class="tip-item">
                             <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                             <div class="tip-content">
                                 <h4>Secure Outdoor Items</h4>
                                 <p>Bring in patio furniture, garbage cans, and anything that can become a projectile.</p>
                             </div>
                         </div>
                    </div>`;
                break;

            case 'tornado':
                title = 'Tornado Protection Tips';
                tipsHTML = `
                    <h2>${title}</h2>
                    <div class="tip-category">
                        <h3>Shelter Safety</h3>
                        <div class="tip-item">
                            <div class="tip-icon"><i class="fas fa-check-circle"></i></div>
                            <div class="tip-content">
                                <h4>Prepare a Safe Room</h4>
                                <p>Identify a basement or interior room on the lowest floor away from windows.</p>
                            </div>
                        </div>
                    </div>`;
                break;

            // Add cases for other disaster types
            default:
                title = 'Home Protection Tips';
        }

        tipsSection.innerHTML = tipsHTML;
        // Smooth scroll to tips
        tipsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }