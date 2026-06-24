// Count Up Animation
    const statNumbers = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const value = parseInt(target.getAttribute('data-target'));
                // Detect suffix like + or /7
                const text = target.innerText;
                const suffix = target.getAttribute('data-suffix') || text.replace(/[0-9]/g, '').trim();

                if (!isNaN(value)) {
                    let current = 0;
                    const duration = 2000;
                    const step = Math.ceil(value / (duration / 16));

                    const timer = setInterval(() => {
                        current += step;
                        if (current >= value) {
                            current = value;
                            clearInterval(timer);
                        }
                        target.innerText = current + suffix;
                    }, 16);
                }
                observer.unobserve(target);
            }
        });
    }, {
        threshold: 0.5
    });

    statNumbers.forEach(stat => observer.observe(stat));