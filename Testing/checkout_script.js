document.addEventListener('DOMContentLoaded', () => {
    const panelContainer = document.querySelector('.panel-container');
    const panels = document.querySelectorAll('.panel');
    const nextButtons = document.querySelectorAll('.next-step-btn');
    const prevButtons = document.querySelectorAll('.prev-step-btn');
    const progressSteps = document.querySelectorAll('.progress-indicator .step');

    const pcSelectionButtons = document.querySelectorAll('#panel-1 .select-button');
    const artworkUploadInput = document.getElementById('artworkUpload');
    const artworkPreview = document.getElementById('artworkPreview');
    const artworkPreviewText = document.getElementById('artworkPreviewText');
    const galleryItems = document.querySelectorAll('#panel-2 .gallery-item');

    const summaryPcName = document.getElementById('summaryPcName');
    const summaryPcPrice = document.getElementById('summaryPcPrice');
    const summaryDesignName = document.getElementById('summaryDesignName');
    const summaryDesignImage = document.getElementById('summaryDesignImage');
    const summaryTotalPrice = document.getElementById('summaryTotalPrice');

    const checkoutButton = document.querySelector('.checkout-button');

    let currentPanel = 0;
    let orderDetails = {
        pc: null, // { name: 'Starter Custom Rig', price: 1499 }
        design: null // { name: 'Red Cyberpunk', image: 'url' } or { name: 'Custom Upload', image: 'dataURL' }
    };

    function updatePanelVisibility() {
        panelContainer.style.transform = `translateX(-${currentPanel * (100 / panels.length)}%)`;
        panels.forEach((panel, index) => {
            if (index === currentPanel) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });

        progressSteps.forEach((step, index) => {
            step.classList.remove('active', 'completed');
            if (index < currentPanel) {
                step.classList.add('completed');
            } else if (index === currentPanel) {
                step.classList.add('active');
            }
        });
    }

    function updateSummary() {
        let total = 0;
        if (orderDetails.pc) {
            summaryPcName.textContent = orderDetails.pc.name;
            summaryPcPrice.textContent = parseFloat(orderDetails.pc.price).toFixed(2);
            total += parseFloat(orderDetails.pc.price);
        } else {
            summaryPcName.textContent = 'N/A';
            summaryPcPrice.textContent = '0.00';
        }

        if (orderDetails.design && orderDetails.design.name !== "No Custom Design") {
            summaryDesignName.textContent = orderDetails.design.name;
            if(orderDetails.design.image && orderDetails.design.image !== "") {
                summaryDesignImage.src = orderDetails.design.image;
                summaryDesignImage.style.display = 'block';
            } else {
                summaryDesignImage.style.display = 'none';
            }
        } else {
            summaryDesignName.textContent = 'No Custom Design (Included)';
            summaryDesignImage.style.display = 'none';
        }
        // Assuming design has no extra cost for this basic version
        summaryTotalPrice.textContent = total.toFixed(2);
    }


    // Panel 1: PC Selection
    pcSelectionButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove 'selected' class from all cards
            pcSelectionButtons.forEach(btn => btn.closest('.option-card').classList.remove('selected'));
            // Add 'selected' class to the clicked card
            button.closest('.option-card').classList.add('selected');

            orderDetails.pc = {
                name: button.dataset.pcName,
                price: parseFloat(button.dataset.pcPrice)
            };
            // Enable the next button for panel 1
            const panel1NextBtn = document.querySelector('#panel-1 .next-step-btn');
            if (panel1NextBtn) {
                panel1NextBtn.disabled = false;
            }
            updateSummary();
        });
    });


    // Panel 2: Design Selection
    artworkUploadInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.type === "image/jpeg" || file.type === "image/png") {
                if (file.size <= 10 * 1024 * 1024) { // 10MB
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        artworkPreview.src = e.target.result;
                        artworkPreview.style.display = 'block';
                        artworkPreviewText.style.display = 'none';
                        orderDetails.design = { name: `Custom: ${file.name}`, image: e.target.result };
                        // Deselect gallery items if custom upload is chosen
                        galleryItems.forEach(item => item.classList.remove('selected'));
                        document.getElementById('selectedDesignName').textContent = `Custom: ${file.name}`;
                        updateSummary();
                    }
                    reader.readAsDataURL(file);
                } else {
                    alert("File is too large. Maximum size is 10MB.");
                    artworkPreview.src = "#";
                    artworkPreview.style.display = 'none';
                    artworkPreviewText.style.display = 'block';
                    artworkUploadInput.value = "";
                }
            } else {
                alert("Invalid file type. Please upload JPG or PNG.");
                artworkPreview.src = "#";
                artworkPreview.style.display = 'none';
                artworkPreviewText.style.display = 'block';
                artworkUploadInput.value = "";
            }
        }
    });

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            galleryItems.forEach(it => it.classList.remove('selected'));
            item.classList.add('selected');
            orderDetails.design = {
                name: item.dataset.designName,
                image: item.dataset.designImage
            };
            // Clear custom upload if gallery item is chosen
            artworkUploadInput.value = "";
            artworkPreview.src = "#";
            artworkPreview.style.display = 'none';
            artworkPreviewText.style.display = 'block';
            document.getElementById('selectedDesignName').textContent = item.dataset.designName;
            updateSummary();
        });
    });


    // Navigation
    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentPanel < panels.length - 1) {
                // Specific validation for panel 1 (PC selection)
                if (currentPanel === 0 && !orderDetails.pc) {
                    alert("Please select a PC configuration to continue.");
                    return;
                }
                 // Specific validation for panel 2 (Design selection) - ensure something is chosen
                if (currentPanel === 1 && !orderDetails.design) {
                    alert("Please choose a design or select 'No Custom Design' to continue.");
                    return;
                }
                currentPanel++;
                updatePanelVisibility();
                if (currentPanel === panels.length -1) { // If on summary panel
                    updateSummary();
                }
            }
        });
    });

    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentPanel > 0) {
                currentPanel--;
                updatePanelVisibility();
            }
        });
    });

    checkoutButton.addEventListener('click', () => {
        if (!orderDetails.pc) {
            alert("Please complete PC selection (Step 1).");
            currentPanel = 0;
            updatePanelVisibility();
            return;
        }
        if (!orderDetails.design) {
            alert("Please complete design selection (Step 2).");
            currentPanel = 1;
            updatePanelVisibility();
            return;
        }
        // Proceed to actual checkout (placeholder)
        alert(`Checkout initiated!\nPC: ${orderDetails.pc.name} ($${orderDetails.pc.price})\nDesign: ${orderDetails.design.name}\nTotal: $${summaryTotalPrice.textContent} AUD`);
        console.log("Order Details:", orderDetails);
        // Here you would typically redirect to a payment gateway or submit the form
    });

    // Initial setup
    updatePanelVisibility();
    // Ensure panel 1 next button is disabled initially
    const panel1NextBtn = document.querySelector('#panel-1 .next-step-btn');
    if (panel1NextBtn) {
        panel1NextBtn.disabled = true;
    }
    // Default design selection to "No Custom Design" if nothing else is picked by the time user reaches summary
    if (!orderDetails.design) {
        const noDesignOption = document.querySelector('.gallery-item[data-design-name="No Custom Design"]');
        if (noDesignOption) {
             orderDetails.design = {
                name: noDesignOption.dataset.designName,
                image: noDesignOption.dataset.designImage
            };
            document.getElementById('selectedDesignName').textContent = noDesignOption.dataset.designName;
        }
    }
    updateSummary(); // Initial summary update
});
