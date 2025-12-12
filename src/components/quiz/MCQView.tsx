import { MCQQuestion } from "@/types/schema";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MCQViewProps {
    question: MCQQuestion;
    selectedOption: string | undefined;
    onSelect: (val: string) => void;
}

export default function MCQView({ question, selectedOption, onSelect }: MCQViewProps) {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 md:p-8 h-full flex flex-col">
            <ScrollArea className="flex-1 pr-4">
                <div className="mb-6">
                     <h2 className="text-xl font-bold mb-2">{question.title}</h2>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: question.description }} />
                    {question.imageUrl && (
                        <div className="mt-4">
                            <img src={question.imageUrl} alt="Question illustration" className="max-w-full rounded-lg border" />
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {question.options.map((option, idx) => (
                        <Card
                            key={idx}
                            className={`flex items-center space-x-3 p-4 rounded-lg cursor-pointer transition-all ${selectedOption === idx.toString() ? 'border-primary ring-2 ring-primary' : 'hover:bg-gray-100'}`}
                            onClick={() => onSelect(idx.toString())}
                        >
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedOption === idx.toString() ? 'border-primary bg-primary' : 'border-gray-400'}`}>
                                {selectedOption === idx.toString() && <div className="h-2 w-2 bg-white rounded-full" />}
                            </div>
                            <Label className="cursor-pointer text-base flex-1">{option}</Label>
                        </Card>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
