exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    try {
        const data = JSON.parse(event.body);
        const imageData = data.image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(imageData, 'base64');
        
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Image processed',
                image: buffer.toString('base64')
            })
        };
    } catch (error) {
        return { statusCode: 500, body: error.toString() };
    }
};
