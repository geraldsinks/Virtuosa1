// seller-application.js — Comprehensive Seller Application Logic
// Handles multi-step navigation, validation, draft-saving, and submission

let currentStep = 1;
const totalSteps = 10;
const DRAFT_KEY = 'virtuosa_seller_draft';
let autoSaveTimer = null;

const stepLabels = [
    'Seller Type',
    'Personal Info',
    'Campus Location',
    'What You Sell',
    'Inventory Source',
    'Payment',
    'Delivery',
    'Verification',
    'Agreements',
    'Additional Info'
];

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please log in to apply as a seller', 'error');
        setTimeout(() => { window.location.href = '/login'; }, 1500);
        return;
    }

    // Check if user already has an application
    await checkApplicationStatus();

    // Load draft from localStorage
    loadDraft();

    // Auto-save draft every 30 seconds
    autoSaveTimer = setInterval(saveDraft, 30000);

    // Setup form submission
    const form = document.getElementById('seller-application-form');
    form.addEventListener('submit', handleSubmit);

    // Setup conditional field listeners
    setupConditionalFields();

    // Setup university "other" field toggle
    const universitySelect = document.querySelector('select[name="university"]');
    if (universitySelect) {
        universitySelect.addEventListener('change', () => {
            const otherField = document.getElementById('other-university-field');
            otherField.classList.toggle('hidden', universitySelect.value !== 'other');
        });
    }

    // Pre-fill email from localStorage
    const userEmail = localStorage.getItem('userEmail');
    const emailInput = document.querySelector('input[name="email"]');
    if (userEmail && emailInput && !emailInput.value) {
        emailInput.value = userEmail;
    }

    // Pre-fill name from localStorage
    const userFullName = localStorage.getItem('userFullName');
    const nameInput = document.querySelector('input[name="fullName"]');
    if (userFullName && nameInput && !nameInput.value) {
        nameInput.value = userFullName;
    }

    updateUI();
});

// ==============================
// APPLICATION STATUS CHECK
// ==============================

async function checkApplicationStatus() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/seller/application-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const data = await response.json();
        if (!data.hasApplication) return;

        const container = document.getElementById('application-status-container');
        const formContainer = document.getElementById('application-form-container');

        if (data.status === 'Pending') {
            container.innerHTML = `
                <div class="status-card pending">
                    <div class="text-5xl mb-4">⏳</div>
                    <h2 class="text-2xl font-bold text-indigo-900 mb-2">Application Under Review</h2>
                    <p class="text-indigo-700 mb-4 max-w-md mx-auto">
                        We've received your application! Our team is reviewing your details to ensure a safe marketplace for everyone.
                    </p>
                    <div class="flex items-center justify-center gap-2 text-sm text-indigo-500 font-medium">
                        <span class="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        <span>Submitted ${formatDate(data.submittedAt)} • Estimated review: 24–48 hours</span>
                    </div>
                </div>
            `;
            container.classList.remove('hidden');
            formContainer.classList.add('hidden');
        } else if (data.status === 'Rejected') {
            container.innerHTML = `
                <div class="status-card rejected">
                    <div class="text-5xl mb-4">📝</div>
                    <h2 class="text-xl font-bold text-red-900 mb-2">Application Not Approved</h2>
                    <p class="text-red-700 mb-2">
                        ${data.rejectionReason ? `<strong>Reason:</strong> ${data.rejectionReason}` : 'Your previous application was not approved.'}
                    </p>
                    <p class="text-sm text-red-600 mb-4">
                        Reviewed on ${formatDate(data.reviewedAt)}. You can update your information and reapply below.
                    </p>
                    <button onclick="dismissStatus()" class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold">
                        <i class="fas fa-redo mr-2"></i>Reapply Now
                    </button>
                </div>
            `;
            container.classList.remove('hidden');
            formContainer.classList.add('hidden');
        } else if (data.status === 'Approved') {
            container.innerHTML = `
                <div class="status-card" style="background: linear-gradient(135deg, #F0FDF4, #DCFCE7); border: 1px solid #BBF7D0;">
                    <div class="text-5xl mb-4">🎉</div>
                    <h2 class="text-2xl font-bold text-green-900 mb-2">You're an Approved Seller!</h2>
                    <p class="text-green-700 mb-4">Your application was approved. Start listing your items and reach customers across campus.</p>
                    <div class="flex flex-wrap justify-center gap-3">
                        <a href="/create-product" class="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold">
                            <i class="fas fa-plus mr-2"></i>Create Listing
                        </a>
                        <a href="/seller-dashboard" class="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-semibold">
                            <i class="fas fa-tachometer-alt mr-2"></i>Seller Dashboard
                        </a>
                    </div>
                </div>
            `;
            container.classList.remove('hidden');
            formContainer.classList.add('hidden');
        }
    } catch (error) {
        console.error('Error checking application status:', error);
    }
}

window.dismissStatus = function () {
    document.getElementById('application-status-container').classList.add('hidden');
    document.getElementById('application-form-container').classList.remove('hidden');
};

// ==============================
// MULTI-STEP NAVIGATION
// ==============================

function updateUI() {
    // Update step dots
    document.querySelectorAll('.step-dot').forEach(dot => {
        const step = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'completed');
        if (step === currentStep) dot.classList.add('active');
        else if (step < currentStep) dot.classList.add('completed');
    });

    // Update progress bar
    const fill = document.getElementById('step-progress-fill');
    const pct = ((currentStep - 1) / (totalSteps - 1)) * 100;
    fill.style.width = pct + '%';

    // Update step label
    document.getElementById('step-label').textContent = `Step ${currentStep} of ${totalSteps} — ${stepLabels[currentStep - 1]}`;

    // Show/hide sections
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`section-${currentStep}`).classList.add('active');

    // Show/hide buttons
    const prevBtn = document.getElementById('btn-prev');
    const nextBtn = document.getElementById('btn-next');
    const submitBtn = document.getElementById('btn-submit');

    prevBtn.classList.toggle('hidden', currentStep === 1);
    prevBtn.style.display = currentStep === 1 ? 'none' : 'flex';

    if (currentStep === totalSteps) {
        nextBtn.classList.add('hidden');
        nextBtn.style.display = 'none';
        submitBtn.classList.remove('hidden');
        submitBtn.style.display = 'flex';
    } else {
        nextBtn.classList.remove('hidden');
        nextBtn.style.display = 'flex';
        submitBtn.classList.add('hidden');
        submitBtn.style.display = 'none';
    }

    // Scroll to top of form on mobile
    const formContainer = document.getElementById('application-form-container');
    if (formContainer && window.innerWidth < 768) {
        formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

window.nextStep = function () {
    if (!validateCurrentStep()) return;
    if (currentStep < totalSteps) {
        currentStep++;
        updateUI();
        saveDraft();
    }
};

window.prevStep = function () {
    if (currentStep > 1) {
        currentStep--;
        updateUI();
    }
};

window.goToStep = function (step) {
    // Only allow going back or to already-completed steps
    if (step <= currentStep) {
        currentStep = step;
        updateUI();
    }
};

// ==============================
// VALIDATION
// ==============================

function validateCurrentStep() {
    clearErrors();

    switch (currentStep) {
        case 1: return validateSellerType();
        case 2: return validatePersonalInfo();
        case 3: return validateCampusLocation();
        case 9: return validateAgreements();
        default: return true; // Other sections are optional or have minimal validation
    }
}

function validateSellerType() {
    const sellerType = document.getElementById('sellerType').value;
    if (!sellerType) {
        showFieldError('sellerType-error', 'Please select a seller type');
        return false;
    }
    return true;
}

function validatePersonalInfo() {
    const form = document.getElementById('seller-application-form');
    const fullName = form.querySelector('input[name="fullName"]').value.trim();
    const university = form.querySelector('select[name="university"]').value;
    const phone = form.querySelector('input[name="phoneNumber"]').value.trim();
    const email = form.querySelector('input[name="email"]').value.trim();

    if (!fullName) {
        showToast('Please enter your full name', 'error');
        return false;
    }
    if (!university) {
        showToast('Please select your university', 'error');
        return false;
    }
    if (university === 'other') {
        const otherUni = form.querySelector('input[name="otherUniversity"]').value.trim();
        if (!otherUni) {
            showToast('Please specify your university', 'error');
            return false;
        }
    }
    if (!phone) {
        showToast('Please enter your phone number', 'error');
        return false;
    }
    // Validate Zambian phone format
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\+260\d{9}$/.test(cleanPhone)) {
        showToast('Invalid phone format. Use +260 followed by 9 digits', 'error');
        return false;
    }
    if (!email || !email.includes('@')) {
        showToast('Please enter a valid email address', 'error');
        return false;
    }
    // NRC required for external vendors
    const sellerType = document.getElementById('sellerType').value;
    if (sellerType === 'ExternalVendor') {
        const nrc = form.querySelector('input[name="nrcNumber"]').value.trim();
        if (!nrc) {
            showToast('NRC number is required for external vendors', 'error');
            return false;
        }
    }
    return true;
}

function validateCampusLocation() {
    const campus = document.querySelector('input[name="campus"]').value.trim();
    if (!campus) {
        showToast('Please enter your campus/location', 'error');
        return false;
    }
    return true;
}

function validateAgreements() {
    const required = ['noProhibitedItems', 'noScamming', 'respectCommitment', 'accurateDescriptions'];
    for (const name of required) {
        const cb = document.querySelector(`input[name="${name}"]`);
        if (!cb || !cb.checked) {
            showFieldError('agreements-error', 'You must agree to all required commitments');
            return false;
        }
    }
    return true;
}

function clearErrors() {
    document.querySelectorAll('.form-error').forEach(e => e.style.display = 'none');
    document.querySelectorAll('.form-input.error').forEach(e => e.classList.remove('error'));
}

function showFieldError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

// ==============================
// INTERACTIVE ELEMENTS
// ==============================

window.selectSellerType = function (card) {
    document.querySelectorAll('.seller-type-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    const type = card.dataset.type;
    document.getElementById('sellerType').value = type;

    // Update conditional fields based on seller type
    updateConditionalFields(type);
};

window.toggleCheckCard = function (card) {
    const checkbox = card.querySelector('input[type="checkbox"]');
    if (checkbox) {
        checkbox.checked = !checkbox.checked;
        card.classList.toggle('selected', checkbox.checked);

        // Handle "Other" category visibility
        if (checkbox.value === 'Other') {
            const parentGrid = card.closest('[id$="-grid"]');
            if (parentGrid) {
                const gridId = parentGrid.id;
                if (gridId === 'categories-grid') {
                    document.getElementById('other-category-field').classList.toggle('hidden', !checkbox.checked);
                } else if (gridId === 'sources-grid') {
                    document.getElementById('other-source-field').classList.toggle('hidden', !checkbox.checked);
                }
            }
        }
    }
};

window.toggleRadio = function (card, name, value) {
    // Deselect siblings
    const parent = card.parentElement;
    parent.querySelectorAll('.check-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    // Check the radio
    const radio = card.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;

    // Handle delivery radius field
    if (name === 'canDeliver') {
        document.getElementById('delivery-radius-field').classList.toggle('hidden', value !== 'yes');
    }
};

function setupConditionalFields() {
    // Nothing extra needed — conditional logic handled via selectSellerType
}

function updateConditionalFields(type) {
    const studentFields = ['student-id-field', 'year-of-study-field', 'program-field'];
    const nrcRequired = document.getElementById('nrc-required');
    const nrcHint = document.getElementById('nrc-hint');

    if (type === 'Student' || type === 'Cooperative') {
        studentFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'block';
        });
        if (nrcRequired) nrcRequired.classList.add('hidden');
        if (nrcHint) nrcHint.textContent = 'Optional for students';
    } else if (type === 'ExternalVendor') {
        studentFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        if (nrcRequired) nrcRequired.classList.remove('hidden');
        if (nrcHint) nrcHint.textContent = 'Required for external vendors';
    } else {
        // CampusBusiness
        studentFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        if (nrcRequired) nrcRequired.classList.add('hidden');
        if (nrcHint) nrcHint.textContent = 'Optional for campus businesses';
    }
}

// ==============================
// DRAFT SAVING (localStorage)
// ==============================

function saveDraft() {
    try {
        const form = document.getElementById('seller-application-form');
        const data = {
            currentStep,
            sellerType: document.getElementById('sellerType').value,
            fields: {},
            checkboxes: {},
            timestamp: new Date().toISOString()
        };

        // Save text/select inputs
        form.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"], select, textarea').forEach(el => {
            if (el.name) data.fields[el.name] = el.value;
        });

        // Save checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(el => {
            if (el.name) {
                if (!data.checkboxes[el.name]) data.checkboxes[el.name] = {};
                data.checkboxes[el.name][el.value || el.id] = el.checked;
            }
        });

        // Save radio buttons
        data.radios = {};
        form.querySelectorAll('input[type="radio"]:checked').forEach(el => {
            data.radios[el.name] = el.value;
        });

        localStorage.setItem(DRAFT_KEY, JSON.stringify(data));

        // Show draft indicator
        const indicator = document.getElementById('draft-indicator');
        indicator.classList.add('show');
        setTimeout(() => indicator.classList.remove('show'), 2000);
    } catch (e) {
        console.warn('Failed to save draft:', e);
    }
}

function loadDraft() {
    try {
        const saved = localStorage.getItem(DRAFT_KEY);
        if (!saved) return;

        const data = JSON.parse(saved);
        const form = document.getElementById('seller-application-form');

        // Restore seller type
        if (data.sellerType) {
            document.getElementById('sellerType').value = data.sellerType;
            const typeCard = document.querySelector(`.seller-type-card[data-type="${data.sellerType}"]`);
            if (typeCard) {
                typeCard.classList.add('selected');
                updateConditionalFields(data.sellerType);
            }
        }

        // Restore text/select inputs
        if (data.fields) {
            Object.entries(data.fields).forEach(([name, value]) => {
                const el = form.querySelector(`[name="${name}"]`);
                if (el && value) el.value = value;
            });
        }

        // Trigger university "other" field
        const uni = form.querySelector('select[name="university"]');
        if (uni && uni.value === 'other') {
            document.getElementById('other-university-field').classList.remove('hidden');
        }

        // Restore checkboxes
        if (data.checkboxes) {
            Object.entries(data.checkboxes).forEach(([name, values]) => {
                Object.entries(values).forEach(([val, checked]) => {
                    let el;
                    if (val.startsWith('agree-')) {
                        el = document.getElementById(val);
                    } else {
                        el = form.querySelector(`input[type="checkbox"][name="${name}"][value="${val}"]`);
                    }
                    if (el) {
                        el.checked = checked;
                        const card = el.closest('.check-card');
                        if (card) card.classList.toggle('selected', checked);

                        // Show "other" fields if applicable
                        if (val === 'Other' && checked) {
                            const grid = el.closest('[id$="-grid"]');
                            if (grid) {
                                if (grid.id === 'categories-grid') document.getElementById('other-category-field').classList.remove('hidden');
                                if (grid.id === 'sources-grid') document.getElementById('other-source-field').classList.remove('hidden');
                            }
                        }
                    }
                });
            });
        }

        // Restore radio buttons
        if (data.radios) {
            Object.entries(data.radios).forEach(([name, value]) => {
                const el = form.querySelector(`input[type="radio"][name="${name}"][value="${value}"]`);
                if (el) {
                    el.checked = true;
                    const card = el.closest('.check-card');
                    if (card) {
                        card.parentElement.querySelectorAll('.check-card').forEach(c => c.classList.remove('selected'));
                        card.classList.add('selected');
                    }

                    // Handle delivery radius
                    if (name === 'canDeliver' && value === 'yes') {
                        document.getElementById('delivery-radius-field').classList.remove('hidden');
                    }
                }
            });
        }
    } catch (e) {
        console.warn('Failed to load draft:', e);
    }
}

function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
}

// ==============================
// FORM SUBMISSION
// ==============================

async function handleSubmit(e) {
    e.preventDefault();

    // Validate final step
    if (!validateAgreements()) return;

    const token = localStorage.getItem('token');
    if (!token) {
        showToast('Please log in to submit your application', 'error');
        return;
    }

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Submitting...';

    try {
        const form = document.getElementById('seller-application-form');

        // Gather university value
        let university = form.querySelector('select[name="university"]').value;
        if (university === 'other') {
            university = form.querySelector('input[name="otherUniversity"]').value.trim();
        }

        const applicationData = {
            sellerType: document.getElementById('sellerType').value,

            personalInfo: {
                fullName: form.querySelector('input[name="fullName"]').value.trim(),
                studentId: form.querySelector('input[name="studentId"]')?.value.trim() || '',
                university: university,
                nrcNumber: form.querySelector('input[name="nrcNumber"]')?.value.trim() || '',
                phoneNumber: form.querySelector('input[name="phoneNumber"]').value.trim().replace(/\s/g, ''),
                email: form.querySelector('input[name="email"]').value.trim(),
                yearOfStudy: form.querySelector('select[name="yearOfStudy"]')?.value || '',
                program: form.querySelector('input[name="program"]')?.value.trim() || ''
            },

            campusLocation: {
                campus: form.querySelector('input[name="campus"]').value.trim(),
                physicalAccess: form.querySelector('input[name="physicalAccess"][value="yes"]')?.checked || false,
                pickupLocation: form.querySelector('input[name="pickupLocation"]')?.value.trim() || '',
                canDeliver: form.querySelector('input[name="canDeliver"][value="yes"]')?.checked || false,
                deliveryRadius: parseInt(form.querySelector('input[name="deliveryRadius"]')?.value) || 0
            },

            sellingInfo: {
                categories: getCheckedValues('categories'),
                otherCategory: form.querySelector('input[name="otherCategory"]')?.value.trim() || '',
                sellingExperience: form.querySelector('select[name="sellingExperience"]')?.value || '',
                currentSaleChannels: (form.querySelector('input[name="currentSaleChannels"]')?.value || '').split(',').map(s => s.trim()).filter(Boolean),
                storeName: form.querySelector('input[name="storeName"]')?.value.trim() || '',
                storeDescription: form.querySelector('textarea[name="storeDescription"]')?.value.trim() || ''
            },

            inventorySource: {
                sources: getCheckedValues('sources'),
                otherSource: form.querySelector('input[name="otherSource"]')?.value.trim() || '',
                plannedItemCount: form.querySelector('select[name="plannedItemCount"]')?.value || ''
            },

            paymentPreferences: {
                methods: getCheckedValues('paymentMethods'),
                understandsCommission: form.querySelector('select[name="understandsCommission"]')?.value || ''
            },

            deliveryArrangements: {
                methods: getCheckedValues('deliveryMethods'),
                meetupLocation: form.querySelector('input[name="meetupLocation"]')?.value.trim() || ''
            },

            verification: {
                documents: getCheckedValues('verificationDocs'),
                willingToOrient: form.querySelector('input[name="willingToOrient"][value="yes"]')?.checked || false
            },

            agreements: {
                enrolledConfirm: form.querySelector('input[name="enrolledConfirm"]')?.checked || false,
                noProhibitedItems: form.querySelector('input[name="noProhibitedItems"]')?.checked || false,
                noScamming: form.querySelector('input[name="noScamming"]')?.checked || false,
                respectCommitment: form.querySelector('input[name="respectCommitment"]')?.checked || false,
                accurateDescriptions: form.querySelector('input[name="accurateDescriptions"]')?.checked || false
            },

            additionalContext: {
                challenges: form.querySelector('textarea[name="challenges"]')?.value.trim() || '',
                trustFactors: form.querySelector('textarea[name="trustFactors"]')?.value.trim() || '',
                referralName: form.querySelector('input[name="referralName"]')?.value.trim() || ''
            }
        };

        const response = await fetch(`${API_BASE}/seller/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(applicationData)
        });

        const result = await response.json();

        if (response.ok) {
            clearDraft();
            if (autoSaveTimer) clearInterval(autoSaveTimer);
            showToast('Application submitted successfully! 🎉', 'success');

            // Show pending status
            setTimeout(() => {
                checkApplicationStatus();
            }, 1500);
        } else {
            showToast(result.message || 'Failed to submit application', 'error');
        }
    } catch (error) {
        console.error('Submission error:', error);
        showToast('An error occurred. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane text-sm"></i> Submit Application';
    }
}

function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
}

// ==============================
// UTILITIES
// ==============================

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i>${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZM', { day: 'numeric', month: 'short', year: 'numeric' });
}
