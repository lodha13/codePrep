'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition } from 'react';

import { uploadQuizzes } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload } from 'lucide-react';

const formSchema = z.object({
  quizJson: z.string().min(1, 'JSON content cannot be empty.'),
});

export function QuizManager() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quizJson: `[
  {
    "id": "java-1",
    "title": "Core Java Concepts",
    "description": "Fundamental questions about the Java programming language.",
    "skill": "Java",
    "questions": [
      {
        "id": "q1",
        "type": "multiple-choice",
        "question": "Which of these is NOT a primitive type in Java?",
        "options": ["int", "String", "boolean", "char"],
        "answer": "String",
        "mark": 10
      },
      {
        "id": "q2",
        "type": "coding",
        "question": "Reverse a String",
        "description": "Write a function that reverses a string.",
        "language": "java",
        "template": "class Solution { public String reverseString(String s) { // your code here } }",
        "testCases": [
          { "input": "hello", "expectedOutput": "olleh" },
          { "input": "Java", "expectedOutput": "avaJ" }
        ],
        "mark": 20
      }
    ]
  }
]`,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append('quizJson', values.quizJson);
      
      const result = await uploadQuizzes(formData);

      if (result.success) {
        toast({
          title: 'Success!',
          description: result.message,
        });
        // Optionally reset form
        // form.reset();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload New Quizzes</CardTitle>
        <CardDescription>Paste the quiz data in JSON format below. Ensure each question has a "mark" attribute. The new quizzes will be added to the existing list.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="quizJson"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quiz JSON Data</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="[{...}]"
                      className="min-h-[300px] font-code text-xs"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isPending ? 'Uploading...' : 'Upload Quizzes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
