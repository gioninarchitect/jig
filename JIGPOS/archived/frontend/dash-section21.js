// dash-section21.js — Section 21 medical access, verification, medical products
// Depends on: config.js (API_URL), dbc-utils.js (showNotification)
// Depends on: dash-core.js (showConfirmModal), dash-products.js (updateCartCount)

// ===== SECTION 21 MEDICAL ACCESS FUNCTIONS =====
// Section 21 is a THIRD-PARTY integration via iframe embed

// Configuration for third-party Section 21 portal
const SECTION21_CONFIG = {
    // Replace with actual third-party portal URL when available
    portalUrl: 'https://section21.example.com/patient-portal',
    // Set to true when third-party URL is configured
    isConfigured: false
};

// Open Section 21 Modal - Uses showConfirmModal for consistency
function openSection21Modal() {
    showConfirmModal(
        'Medical Cannabis Access',
        'Section 21 verification is required to access medical cannabis products. Our third-party verification portal is being integrated. In the meantime, please email hello@debudchef.co.za with your Section 21 authorisation letter for manual verification.',
        'fa-prescription-bottle-medical',
        function() {},
        'OK',
        null  // No cancel button
    );
}

// Close Section 21 Modal
function closeSection21Modal() {
    const modal = document.getElementById('section21Modal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('section21Modal');
    if (e.target === modal) {
        closeSection21Modal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeSection21Modal();
    }
});

function loadSection21Portal() {
    if (!SECTION21_CONFIG.isConfigured) {
        // Show integration pending modal using the working showConfirmModal
        showConfirmModal(
            'Third-Party Integration',
            'The Section 21 Verification Portal requires integration with a licensed medical cannabis provider. This integration is pending final configuration. In the meantime, please email hello@debudchef.co.za for manual verification.',
            'fa-clock',
            function() {},
            'OK',
            null  // No cancel button
        );
        return;
    }

    const placeholder = document.getElementById('section21Placeholder');
    const iframe = document.getElementById('section21Iframe');

    // Get user info for portal
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');

    // Build iframe URL with user context
    const portalUrl = new URL(SECTION21_CONFIG.portalUrl);
    portalUrl.searchParams.set('userId', user.id || '');
    portalUrl.searchParams.set('email', user.email || '');
    portalUrl.searchParams.set('name', `${user.firstName || ''} ${user.lastName || ''}`.trim());

    // Hide placeholder, show iframe
    placeholder.style.display = 'none';
    iframe.src = portalUrl.toString();
    iframe.style.display = 'block';
}

// Check and display Section 21 status
async function checkSection21Status() {
    const statusContainer = document.getElementById('section21Status');
    const medicalTab = document.querySelector('[onclick="switchTab(\'medical\')"]');

    // Get user data from session
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const section21Status = user.section21Status || userData?.section21Status || 'none';

    console.log('[Section21] User status:', section21Status);

    if (section21Status === 'pending') {
        // Show pending status with yellow banner
        statusContainer.innerHTML = `
            <div style="padding: 2rem;">
                <div style="background: #f59e0b; color: #000; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
                    <i class="fas fa-clock" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Application Pending</h3>
                    <p>Your Section 21 application is currently under review. This typically takes 2-5 business days.</p>
                </div>
                <div style="background: var(--bg-tertiary); padding: 1.5rem; border-radius: 8px;">
                    <h4 style="margin-bottom: 1rem; color: #FFFFFF;">What happens next?</h4>
                    <ul style="color: var(--text-muted); line-height: 1.8; padding-left: 1.5rem;">
                        <li>Our team will verify your Section 21 authorization documents</li>
                        <li>You will receive an email notification once approved</li>
                        <li>Once approved, you will gain access to medical cannabis products</li>
                    </ul>
                </div>
            </div>
        `;
        // Add pending badge to Medical Cannabis tab
        if (medicalTab) {
            medicalTab.innerHTML = 'Medical Cannabis <span style="background: #f59e0b; color: #000; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">PENDING</span>';
        }
    } else if (section21Status === 'approved') {
        // Show approved status with green banner
        statusContainer.innerHTML = `
            <div style="padding: 2rem;">
                <div style="background: #10b981; color: #000; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center;">
                    <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <h3 style="margin-bottom: 0.5rem;">Section 21 Approved</h3>
                    <p>You have full access to medical cannabis products.</p>
                </div>
                <div style="text-align: center;">
                    <a href="products.html?category=medical" class="btn btn-primary" style="background: #FFFFFF; color: #000; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        <i class="fas fa-cannabis"></i> Browse Medical Products
                    </a>
                </div>
            </div>
        `;
        // Add approved badge to Medical Cannabis tab
        if (medicalTab) {
            medicalTab.innerHTML = 'Medical Cannabis <span style="background: #10b981; color: #000; font-size: 0.7rem; padding: 2px 6px; border-radius: 10px; margin-left: 5px;">APPROVED</span>';
        }
    } else {
        // Show application prompt for users without Section 21 status
        statusContainer.innerHTML = `
            <div style="padding: 2rem; text-align: center;">
                <div style="background: var(--bg-tertiary); padding: 2rem; border-radius: 8px;">
                    <i class="fas fa-file-medical" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3 style="margin-bottom: 1rem; color: #FFFFFF;">Medical Cannabis Access</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
                        To access medical cannabis products, you need a valid Section 21 authorization from SAHPRA.
                    </p>
                    <a href="section21-apply.html" class="btn btn-primary" style="background: #FFFFFF; color: #000; padding: 1rem 2rem; text-decoration: none; border-radius: 8px; font-weight: bold;">
                        Apply for Section 21 Access
                    </a>
                </div>
            </div>
        `;
    }
}

function displayNoSection21() {
    const statusContainer = document.getElementById('section21Status');
    statusContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <p style="color: var(--text-muted); margin-bottom: 1rem;">Please login to access medical cannabis products</p>
            <a href="login.html" class="btn btn-primary">Login</a>
        </div>
    `;
}

function displayUploadForm() {
    const statusContainer = document.getElementById('section21Status');
    statusContainer.innerHTML = `
        <div style="padding: 2rem;">
            <div style="background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 1rem; color: var(--primary-color);">Step 1: Upload Section 21 Authorization Letter</h3>
                <p style="color: var(--text-muted); margin-bottom: 1rem;">
                    To access medical cannabis products, you must first obtain and upload a Section 21 Authorization Letter from your healthcare provider.
                </p>
                <div style="background: rgba(245, 158, 11, 0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid var(--warning-color); margin-bottom: 1rem;">
                    <p style="color: var(--warning-color); font-weight: 600; margin-bottom: 0.5rem;">Two-Step Process:</p>
                    <ol style="color: var(--text-muted); margin-left: 1.5rem;">
                        <li><strong>Authorization Letter</strong> (Section 21 Letter) - Valid for 180 days</li>
                        <li><strong>Prescription</strong> - Required after Auth Letter approval</li>
                    </ol>
                </div>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem;"><strong>Requirements for Authorization Letter:</strong></p>
                <ul style="color: var(--text-muted); margin-left: 1.5rem; margin-bottom: 1rem; font-size: 0.875rem;">
                    <li>Valid Section 21 Authorization from licensed healthcare provider</li>
                    <li>Must include doctor's details and practice number</li>
                    <li>Patient name must match your account</li>
                    <li>Clear, readable document (PDF or image)</li>
                    <li>Valid for 180 days from issue date</li>
                </ul>
            </div>

            <form id="section21Form" onsubmit="submitSection21(event)">
                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Doctor's Name *</label>
                    <input type="text" name="doctorName" required style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Doctor's Practice Number *</label>
                    <input type="text" name="practiceNumber" required style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Authorization Letter Issue Date *</label>
                    <input type="date" name="authorizationDate" required style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                    <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Valid for 180 days from this date</p>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Upload Section 21 Authorization Letter *</label>
                    <input type="file" name="authorizationFile" accept=".pdf,.jpg,.jpeg,.png" required style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                    <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">Accepted formats: PDF, JPG, PNG (Max 5MB)</p>
                    <p style="font-size: 0.75rem; color: var(--warning-color); margin-top: 0.5rem;"><strong>Note:</strong> After approval, you'll be able to upload your prescription</p>
                </div>

                <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Authorization Letter</button>
            </form>
        </div>
    `;
}

function displayPendingStatus(data) {
    const statusContainer = document.getElementById('section21Status');
    const isAuthLetter = !data.hasApprovedAuthLetter;
    const documentType = isAuthLetter ? 'Authorization Letter' : 'Prescription';

    statusContainer.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div style="width: 60px; height: 60px; background: rgba(245, 158, 11, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                <span style="font-size: 2rem;">&#8987;</span>
            </div>
            <h3 style="margin-bottom: 0.5rem; color: var(--warning-color);">${documentType} Under Review</h3>
            <p style="color: var(--text-muted); margin-bottom: 1rem;">
                Your Section 21 ${documentType.toLowerCase()} has been submitted and is currently being reviewed by our medical team.
            </p>
            <div style="background: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px; display: inline-block; margin-bottom: 1rem;">
                <p style="font-size: 0.875rem; color: var(--text-muted);">Step ${isAuthLetter ? '1' : '2'} of 2</p>
                <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.25rem;">
                    Submitted: ${new Date(data.submittedAt).toLocaleDateString()}
                </p>
            </div>
            <p style="font-size: 0.875rem; color: var(--text-muted);">
                This usually takes 24-48 hours. You'll receive an email once approved.
            </p>
            ${isAuthLetter ? '<p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.5rem;">After approval, you will be prompted to upload your prescription.</p>' : ''}
        </div>
    `;
}

function displayApprovedStatus(data) {
    const statusContainer = document.getElementById('section21Status');
    const hasAuthLetter = data.hasApprovedAuthLetter;
    const hasPrescription = data.hasApprovedPrescription;

    // Calculate validity (180 days for auth letter)
    const authLetterDate = new Date(data.authLetterDate);
    const expiryDate = new Date(authLetterDate);
    expiryDate.setDate(expiryDate.getDate() + 180);

    if (hasAuthLetter && !hasPrescription) {
        // Auth letter approved, needs prescription
        statusContainer.innerHTML = `
            <div style="padding: 2rem;">
                <div style="text-align: center; margin-bottom: 2rem;">
                    <div style="width: 60px; height: 60px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                    <h3 style="margin-bottom: 0.5rem; color: var(--success-color);">Authorization Letter Approved</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1rem;">
                        Step 1 complete. Now upload your prescription to access medical cannabis products.
                    </p>
                    <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1.5rem;">
                        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; flex: 1; min-width: 150px;">
                            <p style="font-size: 0.875rem; color: var(--text-muted);">Valid Until</p>
                            <p style="font-weight: 600; color: var(--text-primary);">${expiryDate.toLocaleDateString()}</p>
                            <p style="font-size: 0.75rem; color: var(--text-muted);">180 days</p>
                        </div>
                        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; flex: 1; min-width: 150px;">
                            <p style="font-size: 0.875rem; color: var(--text-muted);">Authorized By</p>
                            <p style="font-weight: 600; color: var(--text-primary);">${data.doctorName}</p>
                        </div>
                    </div>
                </div>

                <div style="background: rgba(255, 255, 255, 0.05); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem;">
                    <h3 style="margin-bottom: 1rem; color: var(--primary-color);">Step 2: Upload Your Prescription</h3>
                    <p style="color: var(--text-muted); margin-bottom: 1rem; font-size: 0.875rem;">
                        Your authorization has been verified. Now upload a valid prescription from your healthcare provider.
                    </p>
                </div>

                <form id="prescriptionForm" onsubmit="submitPrescription(event)">
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Prescription Date *</label>
                        <input type="date" name="prescriptionDate" required style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                    </div>

                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Upload Prescription Document *</label>
                        <input type="file" name="prescriptionFile" accept=".pdf,.jpg,.jpeg,.png" required style="width: 100%; padding: 0.75rem; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 8px; color: var(--text-primary);">
                        <p style="font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem;">Accepted formats: PDF, JPG, PNG (Max 5MB)</p>
                    </div>

                    <button type="submit" class="btn btn-primary" style="width: 100%;">Submit Prescription</button>
                </form>
            </div>
        `;
    } else if (hasAuthLetter && hasPrescription) {
        // Both approved - full access
        statusContainer.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="width: 60px; height: 60px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>
                <h3 style="margin-bottom: 0.5rem; color: var(--success-color);">Full Medical Access Granted</h3>
                <p style="color: var(--text-muted); margin-bottom: 1rem;">
                    Your Section 21 authorization and prescription have been verified. You now have full access to medical cannabis products.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; flex: 1; min-width: 150px;">
                        <p style="font-size: 0.875rem; color: var(--text-muted);">Authorization Valid Until</p>
                        <p style="font-weight: 600; color: var(--text-primary);">${expiryDate.toLocaleDateString()}</p>
                        <p style="font-size: 0.75rem; color: var(--text-muted);">180 days</p>
                    </div>
                    <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; flex: 1; min-width: 150px;">
                        <p style="font-size: 0.875rem; color: var(--text-muted);">Prescribed By</p>
                        <p style="font-weight: 600; color: var(--text-primary);">${data.doctorName}</p>
                    </div>
                </div>
            </div>
        `;

        // Show medical products section
        document.getElementById('medicalProductsCard').style.display = 'block';
    }
}

async function submitSection21(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const response = await fetch(`${API_URL}/section21/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            showNotification('Prescription submitted successfully! Awaiting verification.', 'success');
            checkSection21Status();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to submit prescription', 'error');
        }
    } catch (error) {
        console.error('Section 21 upload error:', error);
        showNotification('Network error. Please try again.', 'error');
    } finally {
        submitBtn.textContent = 'Submit for Verification';
        submitBtn.disabled = false;
    }
}

async function loadMedicalProducts() {
    const carousel = document.getElementById('medicalProductsCarousel');

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const response = await fetch('/api/v1/products/medical', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayMedicalProducts(data.products || []);
        } else {
            carousel.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--error-color); flex: 0 0 100%;">Failed to load medical products</div>';
        }
    } catch (error) {
        console.error('Load medical products error:', error);
        carousel.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--error-color); flex: 0 0 100%;">Network error loading products</div>';
    }
}

function scrollMedicalProducts(direction) {
    const carousel = document.getElementById('medicalProductsCarousel');
    const scrollAmount = carousel.offsetWidth * 0.8;
    carousel.scrollBy({
        left: direction * scrollAmount,
        behavior: 'smooth'
    });
}

function displayMedicalProducts(products) {
    const carousel = document.getElementById('medicalProductsCarousel');

    if (products.length === 0) {
        carousel.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted); flex: 0 0 100%;">No medical products available at this time</div>';
        return;
    }

    let html = '';
    products.forEach(product => {
        const imageUrl = product.images && product.images.length > 0
            ? product.images[0].url
            : '/images/DeBudChef-rLogo.png';

        html += `
            <div style="flex: 0 0 280px; background: var(--bg-tertiary); border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border-color); cursor: pointer; transition: all 0.3s;" onclick="viewMedicalProduct('${product._id}')">
                <div style="width: 100%; height: 150px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
                    <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.src='/images/DeBudChef-rLogo.png'">
                </div>
                <h3 style="margin-bottom: 0.5rem; font-size: 1.1rem;">${product.name}</h3>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem; line-height: 1.4;">
                    ${product.shortDescription || product.description.substring(0, 80) + '...'}
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 1.25rem; font-weight: 600; color: var(--primary-color);">R${product.price.toFixed(2)}</span>
                    <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" onclick="event.stopPropagation(); addMedicalProductToCart('${product._id}')">Add to Cart</button>
                </div>
            </div>
        `;
    });

    carousel.innerHTML = html;
}

async function viewMedicalProduct(productId) {
    // Reuse the existing product detail modal
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const response = await fetch(`/api/v1/products/${productId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (response.ok) {
            const data = await response.json();
            openProductDetail(data.product);
        }
    } catch (error) {
        console.error('View medical product error:', error);
    }
}

async function addMedicalProductToCart(productId) {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');

        if (!token) {
            showNotification('Please login to purchase medical products', 'error');
            return;
        }

        // Medical products require authentication
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId: productId,
                quantity: 1
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to add to cart');
        }

        const data = await response.json();

        // Update cart count display
        updateCartCount();

        // Show success notification
        showNotification('Medical product added to cart!', 'success');
    } catch (error) {
        console.error('Error adding medical product to cart:', error);
        showNotification(error.message || 'Failed to add product to cart', 'error');
    }
}
