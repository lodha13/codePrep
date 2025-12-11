import { MCQQuestion } from "@/types/schema";
import { Label } from "@/components/ui/label";

interface MCQViewProps {
    question: MCQQuestion;
    selectedOption: string | undefined;
    onSelect: (val: string) => void;
}

export default function MCQView({ question, selectedOption, onSelect }: MCQViewProps) {
    return (
        <div className="space-y-4">
            {question.options.map((option, idx) => (
                <div
                    key={idx}
                    className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${selectedOption === idx.toString() ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}
                    onClick={() => onSelect(idx.toString())}
                >
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${selectedOption === idx.toString() ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                        {selectedOption === idx.toString() && <div className="h-2 w-2 bg-white rounded-full" />}
                    </div>
                    <Label className="cursor-pointer text-base">{option}</Label>
                </div>
            ))}
        </div>
    );
}
