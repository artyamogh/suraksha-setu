
document.addEventListener('DOMContentLoaded', function () {
    // 1. Setup Intersection Observer
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 // Trigger when 15% of element is visible
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target); // Only animate once
            }
        });
    }, observerOptions);

    // 2. Select elements to animate
    // We can either require a .reveal class, or auto-add it to common elements for instant effect
    const autoAnimateSelectors = [
        '.card',
        '.section',
        '.hero',
        '.hero-missing',
        'h1', 'h2', 'h3',
        '.alert',
        '.btn-lg',
        '.person-card',
        '.volunteer-card',
        'form'
    ];

    // Combine manual .reveal elements and auto-selected elements
    const manualElements = document.querySelectorAll('.reveal, .slide-left, .slide-right, .scale-up');
    const autoElements = document.querySelectorAll(autoAnimateSelectors.join(', '));

    // Process manual elements
    manualElements.forEach(el => observer.observe(el));

    // Process auto elements (add .reveal class if provided class isn't there)
    autoElements.forEach(el => {
        // checks if it already has an animation class
        if (!el.classList.contains('reveal') &&
            !el.classList.contains('slide-left') &&
            !el.classList.contains('slide-right') &&
            !el.classList.contains('scale-up')) {

            el.classList.add('reveal');
            observer.observe(el);
        }
    });
});
