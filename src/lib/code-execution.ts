export interface ExecutionResult {
    stdout: string;
    stderr: string;
    compile_output: string;
    message: string;
    status: { id: number; description: string };
    time: string;
    memory: number;
}

export async function executeCode(source_code: string, language_id: number, stdin: string = ""): Promise<ExecutionResult> {
    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': process.env.NEXT_PUBLIC_JUDGE0_API_KEY || '',
            'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        body: JSON.stringify({
            source_code,
            language_id, // 63 = Initial JavaScript, 71 = Python, 62 = Java
            stdin,
        })
    };

    try {
        // 1. Submit Code
        const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(error);
        throw new Error("Execution failed");
    }
}

export const LANGUAGE_IDS = {
    javascript: 63,
    python: 71,
    java: 62,
    cpp: 54,
};
