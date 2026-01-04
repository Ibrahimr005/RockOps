export const addAmiriFont = async (doc) => {
    try {
        // Fetch the Amiri font from a CDN
        const fontUrl = 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf';

        const response = await fetch(fontUrl);
        const fontBlob = await response.blob();

        // Convert blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
            reader.onloadend = () => {
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(fontBlob);
        });

        const base64Font = await base64Promise;

        doc.addFileToVFS('Amiri-Regular.ttf', base64Font);
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
        doc.addFont('Amiri-Regular.ttf', 'Amiri', 'bold');
    } catch (error) {
        console.error('Failed to load Amiri font from CDN:', error);
        throw error;
    }
};