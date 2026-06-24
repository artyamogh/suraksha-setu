// Set active nav link based on current URL
        document.addEventListener('DOMContentLoaded', () => {
            const currentPath = window.location.pathname;
            document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
                if (link.getAttribute('href') === currentPath) {
                    link.classList.add('active');
                }
            });

            // Location detection for navbar
            const navLoc = document.getElementById('nav-user-location');
            if (navLoc && navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (pos) => {
                        try {
                            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
                            const data = await res.json();
                            let city = data.address.city || data.address.town || data.address.state || "Location Found";
                            navLoc.textContent = city;
                            navLoc.classList.remove('opacity-75');
                        } catch (e) {
                            navLoc.textContent = "Location Unknown";
                        }
                    },
                    () => { navLoc.textContent = "Location Disabled"; }
                );
            }
        });