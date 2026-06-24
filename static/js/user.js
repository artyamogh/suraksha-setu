document.addEventListener('DOMContentLoaded', () => {
        // Set current date and time
        document.getElementById('update-time').textContent = new Date().toLocaleString();

        // Alerts are now populated by Jinja2 from the backend

        // Scroll animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.preparedness-section, .emergency-section').forEach(section => {
            observer.observe(section);
        });

        // Add ripple effect to hero
        const hero = document.querySelector('.hero-user');
        if (hero) {
            hero.addEventListener('click', (e) => {
                const ripple = document.createElement('div');
                ripple.style.position = 'absolute';
                ripple.style.width = '20px';
                ripple.style.height = '20px';
                ripple.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                ripple.style.borderRadius = '50%';
                ripple.style.transform = 'translate(-50%, -50%)';
                ripple.style.animation = 'ripple 1.5s ease-out forwards';
                ripple.style.pointerEvents = 'none';

                const rect = hero.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;

                hero.appendChild(ripple);

                setTimeout(() => {
                    ripple.remove();
                }, 1500);
            });
        }
    });