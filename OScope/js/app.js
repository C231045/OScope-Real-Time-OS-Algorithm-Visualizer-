
document.addEventListener("DOMContentLoaded", function () {

    // =================================
    // OSCOPE - MAIN APPLICATION
    // =================================

    // MOBILE SIDEBAR
    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");
    const mainContent = document.querySelector(".main-content");

    if (menuToggle && sidebar) {

        menuToggle.addEventListener("click", function () {
            sidebar.classList.toggle("active");
        });

        // Close sidebar after clicking a navigation link
        document.querySelectorAll(".nav-link").forEach(link => {

            link.addEventListener("click", function () {
                sidebar.classList.remove("active");
            });

        });

        // Close sidebar when clicking outside
        document.addEventListener("click", function (event) {

            if (
                sidebar.classList.contains("active") &&
                !sidebar.contains(event.target) &&
                !menuToggle.contains(event.target)
            ) {
                sidebar.classList.remove("active");
            }

        });
    }


    // =================================
    // ACTIVE NAVIGATION
    // =================================

    const navLinks = document.querySelectorAll(".nav-link");

    function updateActiveLink() {

        const currentHash = window.location.hash || "#dashboard";

        navLinks.forEach(link => {

            link.classList.remove("active");

            if (link.getAttribute("href") === currentHash) {
                link.classList.add("active");
            }

        });

    }

    navLinks.forEach(link => {

        link.addEventListener("click", function () {

            navLinks.forEach(item => {
                item.classList.remove("active");
            });

            this.classList.add("active");

        });

    });

    window.addEventListener("hashchange", updateActiveLink);

    updateActiveLink();


    // =================================
    // SMOOTH SCROLL
    // =================================

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            const target = document.querySelector(targetId);

            if (target) {

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

                history.replaceState(null, "", targetId);
                updateActiveLink();

            }

        });

    });


    // =================================
    // DASHBOARD STATUS
    // =================================

    const statusIndicator = document.querySelector(".status-indicator");

    if (statusIndicator) {

        statusIndicator.innerHTML = `
            <span></span>
            System Ready
        `;

    }


    // =================================
    // FOOTER YEAR
    // =================================

    const footer = document.querySelector(".footer");

    if (footer) {

        const yearText = footer.querySelector("span");

        if (yearText) {
            yearText.textContent =
                `© ${new Date().getFullYear()} OScope. All Rights Reserved.`;
        }

    }


    console.log("OScope Application Loaded Successfully!");

});
