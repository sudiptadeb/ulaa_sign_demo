import jsPDF from 'jspdf';
import verifyPDF from 'pdf-signature-reader';
import {getCertificatesInfoFromPDF} from 'pdf-signature-reader';
import rootCAs from './rootCAs.json';
import forge from 'node-forge';

class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL || window.location.origin;
    }

    async upload(data, file) {
        const formData = new FormData();
        for (const key in data) {
            formData.append(key, data[key]);
        }
        formData.append('file', file);

        const response = await fetch(`${this.baseURL}/upload`, {
            method: 'POST', body: formData
        });

        return await response.json();
    }

    async getEntries() {
        const response = await fetch(`${this.baseURL}/entries`, {
            method: 'GET'
        });

        return await response.json();
    }

    async getFile(uuid) {
        const response = await fetch(`${this.baseURL}/file/${uuid}`, {
            method: 'GET'
        });

        return await response.blob();
    }
}

class PDFUtil {

    static async createPDF(formJson, photoFile) {
        const doc = new jsPDF();

        // Add form data

        // Read the image file as a data URL
        const reader = new FileReader();
        const imgData = await new Promise((resolve, reject) => {
            reader.readAsDataURL(photoFile);
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
        });

        // Embed image in PDF
        doc.addImage(imgData, 'JPEG', 20, 20, 50, 50);

        // Add form data as text
        let yPos = 100;
        for (const [key, value] of Object.entries(formJson)) {
            doc.text(`${key}: ${value}`, 20, yPos);
            yPos += 10;
        }

        // Convert the file to array buffer and hash it
        const arrayBuffer = await new Promise((resolve, reject) => {
            const readerArrayBuffer = new FileReader();
            readerArrayBuffer.readAsArrayBuffer(photoFile);
            readerArrayBuffer.onloadend = () => resolve(readerArrayBuffer.result);
            readerArrayBuffer.onerror = reject;
        });

        const hash = await sha256(arrayBuffer);

        // Add metadata
        const metadata = {
            ImageHash: hash
        };
        const fullData = {...formJson, ...metadata};
        doc.setProperties({
            title: 'Self Declaration Form',
            subject: 'Self Declaration Form with Photo',
            author: formJson.Name,
            keywords: JSON.stringify(fullData),
            ulaadata: JSON.stringify(fullData)
        });

        // Get PDF as Blob and return it
        return doc.output('blob');

    }

    static async getPDFSignature(source) {
        try {
            let pdfBuffer;

            if (typeof source === 'string') {
                // Fetch the PDF file from the provided URL
                const response = await fetch(source);
                if (!response.ok) {
                    throw new Error('Failed to fetch PDF');
                }
                pdfBuffer = await response.arrayBuffer();
            } else if (source instanceof Blob) {
                // Use the provided PDF blob directly
                pdfBuffer = await new Response(source).arrayBuffer();
            } else {
                throw new Error('Invalid input. Expected URL or Blob.');
            }

            // Verify PDF signatures
            const {verified, authenticity, integrity, expired, signatures} = verifyPDF(pdfBuffer);

            // Get certificate information
            const certs = getCertificatesInfoFromPDF(pdfBuffer);

            return {verified, authenticity, integrity, expired, signatures, certs};
        } catch (error) {
            console.error('Error fetching or verifying PDF signature:', error);
            throw error; // Propagate the error for handling at a higher level
        }
    }
}

function sha256(arrayBuffer) {
    return window.crypto.subtle.digest('SHA-256', arrayBuffer).then(buffer => {
        return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
    });
}

class CertUtils {


// Function to parse PEM certificate
    static parsePEM(pem) {
        return forge.pki.certificateFromPem(pem);
    }

// Function to check if certificate is expired
    static isExpired(certificate) {
        const now = new Date();
        return now < certificate.validity.notBefore || now > certificate.validity.notAfter;
    }

// Function to check validity period
    static checkValidity(certificate) {
        const now = new Date();
        return now >= certificate.validity.notBefore && now <= certificate.validity.notAfter;
    }

// Function to verify certificate against root CAs
    static verifyCertificate(certificate) {
        console.log(certificate);
        console.log(`Issued to: ${certificate.subject.getField('CN').value} by ${certificate.issuer.getField('CN').value}`);
        const verified = rootCAs.some(rootCA => {
            try {
                const caCert = forge.pki.certificateFromPem(rootCA);
                console.log(caCert.subject.getField('CN').value);
                console.log(caCert.issued(certificate));
                console.log(caCert.issued(certificate));
                return caCert.verify(certificate);
            } catch (error) {
                // Log the error and continue checking other root CAs
                // console.error('Error verifying certificate with root CA:', error);
                return false;
            }
        });
        return verified;
    }
}

export {ApiClient, PDFUtil, CertUtils};

