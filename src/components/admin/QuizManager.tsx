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
import { Upload } from 'lucide-react';

const formSchema = z.object({
  quizJson: z.string().min(1, 'JSON content cannot be empty.'),
});

export function QuizManager() {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quizJson: '[\n  {\n    "id": "java-1",\n    "title": "Core Java Concepts",\n    "description": "Fundamental questions about the Java programming language.",\n    "skill": "Java",\n    "questions": [\n      {\n        "id": "q1",\n        "type": "multiple-choice",\n        "question": "Which of these is NOT a primitive type in Java?",\n        "options": ["int", "String", "boolean", "char"],\n        "answer": "String"\n      }\n    ]\n  }\n]',
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
        form.reset();
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
        <CardDescription>Paste the quiz data in JSON format below. The new quizzes will be added to the existing list.</CardDescription>
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
              {isPending ? 'Uploading...' : 'Upload Quizzes'} <Upload className="ml-2" />
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
