export function formatError(message: string, status = 500) {
    return {
        success: false,
        error: message,
        status
    };
}

export const formatSuccess = (data: any, statusCode = 200) => {
    const response = {
        status: 'success',
        data
    };

    return response;
};
