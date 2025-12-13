
'use server';

import { generateQuiz } from '@/ai/flows/create-quiz-flow';
import { db } from '@/lib/firebase';
import { Question, Quiz, CodingQuestion, MCQQuestion } from '@/types/schema';
import { writeBatch, collection, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const GenerateQuizSchema = z.object({
  topic: z.string().min(3, { message: "Topic must be at least 3 characters." }),
  complexity: z.enum(['easy', 'medium', 'hard']),
  numberOfQuestions: z.coerce.number().int().min(1).max(30),
});

export async function generateQuizAction(prevState: any, formData: FormData) {
  try {
    const validatedFields = GenerateQuizSchema.safeParse({
      topic: formData.get('topic'),
      complexity: formData.get('complexity'),
      numberOfQuestions: formData.get('numberOfQuestions'),
    });

    if (!validatedFields.success) {
      return { success: false, message: validatedFields.error.errors.map(e => e.message).join(', ') };
    }

    const { topic, complexity, numberOfQuestions } = validatedFields.data;

    // Call the Genkit flow to generate the quiz content
    const aiResult = await generateQuiz({ topic, complexity, numberOfQuestions });
    
    if (!aiResult || !aiResult.quiz || !aiResult.questions) {
      return { success: false, message: "AI failed to generate quiz content. Please try again." };
    }
    
    const { quiz: quizData, questions: questionsData } = aiResult;

    // --- Persist to Firestore ---
    const batch = writeBatch(db);

    // 1. Create and batch-write all the questions
    const questionsCollection = collection(db, 'questions');
    const questionIds: string[] = [];

    questionsData.forEach((q) => {
        const questionRef = doc(questionsCollection); // Auto-generate ID
        questionIds.push(questionRef.id);
        const questionPayload: Omit<Question, 'id' | 'createdAt'> & { createdAt: any } = {
            ...q,
            // @ts-ignore
            createdAt: serverTimestamp(),
        };
        batch.set(questionRef, questionPayload);
    });

    // 2. Create the quiz document with the generated question IDs
    const quizCollection = collection(db, 'quizzes');
    const quizRef = doc(quizCollection);
    
    batch.set(quizRef, {
        ...quizData,
        questionIds: questionIds,
        isPublic: true, // Default to public
        type: 'assessment',
        createdAt: serverTimestamp(),
        // Mock createdBy until proper user association is implemented
        createdBy: 'ai-generator', 
    });
    
    // Commit all writes to the database
    await batch.commit();

    revalidatePath('/admin/quizzes');
    return { success: true, message: `Successfully generated and saved "${quizData.title}".` };

  } catch (error: any) {
    console.error("Quiz generation failed:", error);
    return { success: false, message: error.message || "An unexpected error occurred during quiz generation." };
  }
}

export async function seedQuizAction() {
    try {
        const batch = writeBatch(db);

        // --- Questions Data ---
        const questions: (Omit<MCQQuestion, 'id'> | Omit<CodingQuestion, 'id'>)[] = [
            {
                
                title: 'ExecutorService Shutdown Behavior',
                description: 'What happens if you submit a new task to an `ExecutorService` after `shutdown()` has been called? <br/><pre><code>ExecutorService executor = Executors.newSingleThreadExecutor();\nexecutor.shutdown();\nFuture<String> future = executor.submit(() -> "Task after shutdown");</code></pre>',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'The task is queued and will run after currently running tasks complete.',
                    'A `RejectedExecutionException` is thrown.',
                    'The `submit` method blocks indefinitely.',
                    'The task is executed immediately in the calling thread.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`volatile` Keyword Guarantee',
                description: 'A shared variable is declared as `volatile`. What does the `volatile` keyword primarily guarantee?<br/><pre><code>private volatile boolean flag = false;\n\n// Thread A\nflag = true;\n\n// Thread B\nif (flag) {\n  // do something\n}</code></pre>',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'Atomicity of compound actions (like incrementing).',
                    'That reads and writes are directly from/to main memory (visibility).',
                    'Mutual exclusion for critical sections.',
                    'That the variable can only be accessed by one thread at a time.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`ReentrantLock` vs `synchronized`',
                description: 'Which of the following is a feature of `ReentrantLock` that is NOT available with the `synchronized` keyword?',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'The ability to be re-entered by the same thread.',
                    'The ability to be fair (first-come, first-served).',
                    'The ability to protect a block of code from concurrent access.',
                    'The ability to be used with `wait()` and `notify()`.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`CompletableFuture` Output',
                description: 'What is the output of the following `CompletableFuture` code?<br/><pre><code>CompletableFuture.supplyAsync(() -> "Hello")\n    .thenApplyAsync(s -> s + " World")\n    .thenAccept(System.out::print)\n    .join();\nSystem.out.print(" from Main");</code></pre>',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'Hello World from Main',
                    'from MainHello World',
                    'The output is non-deterministic.',
                    'Hello from MainWorld'
                ],
                correctOptionIndex: 0,
            },
            {
                
                title: '`Thread.join()` Behavior',
                description: 'What is the purpose of `t.join()` in the following code?<br/><pre><code>Thread t = new Thread(() -> {\n    // some long-running task\n});\nt.start();\nt.join(); // What does this line do?\nSystem.out.println("Main thread finished.");</code></pre>',
                type: 'mcq',
                difficulty: 'easy',
                createdAt: new Date(),
                options: [
                    'It starts the execution of thread `t`.',
                    'It interrupts the execution of thread `t`.',
                    'The main thread pauses and waits for thread `t` to complete.',
                    'It joins thread `t` to the main thread pool.'
                ],
                correctOptionIndex: 2,
            },
            {
                
                title: '`ConcurrentHashMap` Atomicity',
                description: 'Which operation is atomic in `ConcurrentHashMap`?<br/><pre><code>ConcurrentHashMap<String, Integer> map = new ConcurrentHashMap<>();</code></pre>',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    '`map.put("key", 1);`',
                    '`if (!map.containsKey("key")) { map.put("key", 1); }`',
                    '`map.putIfAbsent("key", 1);`',
                    'Both A and C.'
                ],
                correctOptionIndex: 2,
            },
            {
                
                title: '`CountDownLatch` Usage',
                description: 'What will be printed to the console?<br/><pre><code>CountDownLatch latch = new CountDownLatch(2);\nnew Thread(() -> {\n    System.out.print("A");\n    latch.countDown();\n}).start();\nnew Thread(() -> {\n    System.out.print("B");\n    latch.countDown();\n}).start();\nlatch.await();\nSystem.out.print("C");</code></pre>',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'ABC',
                    'BAC',
                    'CAB',
                    'The output order of A and B is not guaranteed, but C is always last.'
                ],
                correctOptionIndex: 3,
            },
            {
                
                title: '`Callable` vs `Runnable`',
                description: 'What is the key difference between `Callable` and `Runnable`?',
                type: 'mcq',
                difficulty: 'easy',
                createdAt: new Date(),
                options: [
                    '`Runnable` can throw checked exceptions, `Callable` cannot.',
                    '`Callable` can return a value, `Runnable` cannot.',
                    '`Runnable` is an abstract class, `Callable` is an interface.',
                    '`Callable` must be executed by a `SingleThreadExecutor`, `Runnable` has no such restriction.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`synchronized` method output',
                description: 'Given two threads calling `increment()` on the same `Counter` instance, what is the final value of `count`?<br/><pre><code>class Counter {\n    private int count = 0;\n    public synchronized void increment() {\n        count++;\n    }\n    public int getCount() { return count; }\n}\n// Two threads call increment() 1000 times each.</code></pre>',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'A value less than 2000.',
                    '2000',
                    'A value greater than 2000.',
                    'The result is unpredictable.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: 'Deadlock Condition',
                description: 'Two threads, T1 and T2, need to acquire locks on two resources, R1 and R2. T1 acquires R1, then R2. T2 acquires R2, then R1. What condition does this scenario describe?',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'Race Condition',
                    'Livelock',
                    'Starvation',
                    'Deadlock'
                ],
                correctOptionIndex: 3,
            },
            {
                
                title: '`Future.get()` Behavior',
                description: 'What happens when `future.get()` is called?<br/><pre><code>ExecutorService executor = Executors.newSingleThreadExecutor();\nFuture<String> future = executor.submit(() -> {\n    Thread.sleep(2000);\n    return "Ready";\n});\nString result = future.get(); // This line</code></pre>',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'It returns `null` immediately if the task is not complete.',
                    'It throws an `IllegalStateException` if the task is not complete.',
                    'It blocks the calling thread until the task completes and the result is available.',
                    'It cancels the task.'
                ],
                correctOptionIndex: 2,
            },
            {
                
                title: '`Semaphore` for Resource Limiting',
                description: 'A `Semaphore` is initialized with `new Semaphore(3)`. How many threads can acquire a permit simultaneously without blocking?',
                type: 'mcq',
                difficulty: 'easy',
                createdAt: new Date(),
                options: ['1', '2', '3', 'Unlimited'],
                correctOptionIndex: 2,
            },
            {
                
                title: '`Executors.newCachedThreadPool()` Behavior',
                description: 'You create an `ExecutorService` using `Executors.newCachedThreadPool()`. You submit 100 tasks to it simultaneously. What is the most likely behavior?',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'It will create a fixed number of threads (e.g., 10) and queue the rest of the tasks.',
                    'It will create up to 100 threads (or as many as the system can handle) to execute the tasks concurrently.',
                    'It will reject tasks after a certain threshold is reached.',
                    'It will execute all tasks sequentially on a single thread.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`ThreadLocal` Variable Scope',
                description: 'What is the main characteristic of a `ThreadLocal` variable?<br/><pre><code>ThreadLocal<Integer> userContext = new ThreadLocal<>();\nuserContext.set(123);</code></pre>',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'It is shared among all threads.',
                    'It is accessible only by the thread that created it.',
                    'Each thread has its own independently initialized copy of the variable.',
                    'It is automatically synchronized.'
                ],
                correctOptionIndex: 2,
            },
            {
                
                title: 'Daemon Thread Behavior',
                description: 'If all remaining running threads in a Java application are daemon threads, what happens?',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'The application waits for the daemon threads to complete.',
                    'The application throws an `IllegalThreadStateException`.',
                    'The application exits.',
                    'One of the daemon threads is promoted to a user thread.'
                ],
                correctOptionIndex: 2,
            },
            {
                
                title: '`wait()` and `notifyAll()`',
                description: 'A thread calls `wait()` on an object. What must be true for this to work correctly?',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'The thread must be a daemon thread.',
                    'The thread must own the intrinsic lock of the object.',
                    'The thread must have the highest priority.',
                    'The object must be an instance of `java.util.concurrent.locks.Lock`.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`AtomicInteger` Output',
                description: 'Two threads call `increment()` on the same `Counter` instance 1000 times each. What is a possible final value of `count`?<br/><pre><code>class Counter {\n    private AtomicInteger count = new AtomicInteger(0);\n    public void increment() {\n        count.incrementAndGet();\n    }\n    public int getCount() { return count.get(); }\n}</code></pre>',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'A value less than 2000.',
                    '2000',
                    'A value greater than 2000.',
                    'The result is unpredictable.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`CyclicBarrier` vs `CountDownLatch`',
                description: 'What is a key difference between `CyclicBarrier` and `CountDownLatch`?',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    '`CountDownLatch` can be reset and reused, `CyclicBarrier` cannot.',
                    '`CyclicBarrier` can be reset and reused, `CountDownLatch` cannot.',
                    'Only `CountDownLatch` can be used with an `ExecutorService`.',
                    'Only `CyclicBarrier` can be used to make threads wait.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`CompletableFuture.thenCombine`',
                description: 'What is the purpose of `thenCombine` in this example?<br/><pre><code>CompletableFuture<String> future1 = ...;\nCompletableFuture<String> future2 = ...;\nCompletableFuture<String> combined = future1.thenCombine(future2, (res1, res2) -> res1 + res2);</code></pre>',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'It runs the second future after the first one completes.',
                    'It runs when either of the two futures completes.',
                    'It runs when both futures have completed, combining their results.',
                    'It cancels the second future if the first one fails.'
                ],
                correctOptionIndex: 2,
            },
            {
                
                title: '`StampedLock` Read-Write Behavior',
                description: 'Why might a read operation using `tryOptimisticRead()` on a `StampedLock` need to be retried with a full read lock?',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'Because optimistic reads are not thread-safe.',
                    'Because the lock might have been exclusively locked by a writer between the time the optimistic read stamp was obtained and the read was finished.',
                    'Because optimistic reads are deprecated.',
                    'Because optimistic reads do not provide visibility guarantees.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: 'Find Prime Numbers with ExecutorService',
                description: 'Complete the `findPrimes` method. It should use an `ExecutorService` to check for primality of numbers in a given range in parallel. The method should return a list of all prime numbers found.',
                type: 'coding',
                difficulty: 'hard',
                language: 'java',
                createdAt: new Date(),
                starterCode: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.*;

class Solution {
    public static List<Integer> findPrimes(int start, int end) {
        // Your code here
        // Use an ExecutorService to parallelize the primality tests.
        // Return a sorted list of prime numbers.
        return new ArrayList<>();
    }

    private static boolean isPrime(int number) {
        if (number <= 1) {
            return false;
        }
        for (int i = 2; i * i <= number; i++) {
            if (number % i == 0) {
                return false;
            }
        }
        return true;
    }
}`,
                testCases: [
                    { input: 'start = 1, end = 10', expectedOutput: '[2, 3, 5, 7]', isHidden: false },
                    { input: 'start = 50, end = 60', expectedOutput: '[53, 59]', isHidden: false },
                    { input: 'start = 90, end = 100', expectedOutput: '[97]', isHidden: true },
                ],
            },
            {
                
                title: '`ForkJoinPool` Summation',
                description: 'What is the likely output of this `ForkJoinPool` code?<br/><pre><code>class Sum extends RecursiveTask<Long> { ... } // Assume correct implementation\n\nForkJoinPool pool = ForkJoinPool.commonPool();\nlong total = pool.invoke(new Sum(array, 0, array.length));\nSystem.out.println(total);</code></pre>',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'The sum of the elements in the array.',
                    'The code will not compile without a `RecursiveAction`.',
                    'An `ArrayIndexOutOfBoundsException` because it overruns the array.',
                    '0, because the common pool cannot be used this way.'
                ],
                correctOptionIndex: 0,
            },
            {
                
                title: '`InterruptedException` Handling',
                description: 'A thread is blocked in `Thread.sleep()`. Another thread calls `interrupt()` on it. What happens?',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'The sleeping thread immediately stops execution.',
                    'The `sleep()` method throws an `InterruptedException`.',
                    'The thread\'s interrupted flag is set, but the thread continues to sleep.',
                    'The application crashes.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`ReadWriteLock` Purpose',
                description: 'When is it most beneficial to use a `ReadWriteLock` over a standard `ReentrantLock`?',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'When the number of write operations is much higher than read operations.',
                    'When the number of read operations is much higher than write operations.',
                    'When read and write operations are roughly equal.',
                    'When only one thread will ever access the data structure.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: '`BlockingQueue` `put` method',
                description: 'You call the `put()` method on a `BlockingQueue` that is currently full. What is the behavior of the calling thread?',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    'It returns `false` immediately.',
                    'It throws an `IllegalStateException`.',
                    'It blocks until space becomes available in the queue.',
                    'It discards the oldest element in the queue to make space.'
                ],
                correctOptionIndex: 2,
            },
            {
                
                title: '`synchronized` block output',
                description: 'What is a possible output of this program?<br/><pre><code>public class Test {\n    public static void main(String[] args) {\n        Object lock = new Object();\n        new Thread(() -> {\n            synchronized(lock) {\n                System.out.print("A");\n                try { lock.wait(); } catch (InterruptedException e) {}\n                System.out.print("B");\n            }\n        }).start();\n        new Thread(() -> {\n            synchronized(lock) {\n                System.out.print("C");\n                lock.notify();\n            }\n        }).start();\n    }\n}</code></pre>',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'ACB',
                    'CAB',
                    'ABC',
                    'CBA'
                ],
                correctOptionIndex: 0,
            },
            {
                
                title: 'Producer-Consumer with BlockingQueue',
                description: 'Implement the `Producer` and `Consumer` logic using the provided `BlockingQueue`. The `Producer` should add the numbers 1 through 10 to the queue. The `Consumer` should retrieve all 10 numbers and add them to its `consumedItems` list.',
                type: 'coding',
                difficulty: 'hard',
                language: 'java',
                createdAt: new Date(),
                starterCode: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;

class Solution {
    public static List<Integer> runProducerConsumer() throws InterruptedException {
        BlockingQueue<Integer> queue = new ArrayBlockingQueue<>(10);
        List<Integer> consumedItems = new ArrayList<>();

        Thread producer = new Thread(() -> {
            // Your producer logic here
        });

        Thread consumer = new Thread(() -> {
            // Your consumer logic here
        });

        producer.start();
        consumer.start();

        producer.join();
        consumer.join();

        return consumedItems;
    }
}`,
                testCases: [
                    { input: '', expectedOutput: '[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]', isHidden: false },
                ],
            },
            {
                
                title: '`CompletableFuture` Exception Handling',
                description: 'What is printed by the following code?<br/><pre><code>CompletableFuture.supplyAsync(() -> {\n    if (true) throw new RuntimeException("Error!");\n    return "Success";\n}).exceptionally(ex -> {\n    System.out.print(ex.getMessage());\n    return "Fallback";\n}).thenAccept(System.out::print);</code></pre>',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'Success',
                    'Error!Fallback',
                    'Fallback',
                    'An unhandled exception is thrown.'
                ],
                correctOptionIndex: 1,
            },
            {
                
                title: 'Thread Pool Saturation Policy',
                description: 'You create a `ThreadPoolExecutor` with a fixed-size pool, a bounded queue, and the default `AbortPolicy`. What happens when the pool, the queue, and the max pool size are all saturated, and a new task is submitted?',
                type: 'mcq',
                difficulty: 'hard',
                createdAt: new Date(),
                options: [
                    'The new task is run in the calling thread.',
                    'The oldest task in the queue is discarded.',
                    'A `RejectedExecutionException` is thrown.',
                    'The `submit` method blocks until a thread becomes available.'
                ],
                correctOptionIndex: 2,
            },
            {
                
                title: '`volatile` vs `AtomicInteger`',
                description: 'For a simple counter variable `i` that needs to be incremented by multiple threads, why is `AtomicInteger` preferred over a `volatile int`?',
                type: 'mcq',
                difficulty: 'medium',
                createdAt: new Date(),
                options: [
                    '`volatile int` is slower.',
                    '`volatile` does not guarantee atomicity for the increment operation (read-modify-write).',
                    '`AtomicInteger` provides a wider range of values.',
                    '`volatile` cannot be used with primitive types.'
                ],
                correctOptionIndex: 1,
            },
        ];

        const questionIds = questions.map((_, index) => `jmt_q${index + 1}`);

        // --- Quizzes Data ---
        const quiz: Omit<Quiz, 'id'> = {
            title: 'Expert Java Multithreading Assessment',
            description: 'A comprehensive quiz to test deep, practical knowledge of Java\'s concurrency features, including code analysis and problem-solving.',
            durationMinutes: 60,
            category: 'Programming',
            type: 'assessment',
            questionIds: questionIds,
            createdAt: new Date(),
            isPublic: true,
            difficulty: 'hard',
            // @ts-ignore
            createdBy: 'seed-script'
        };
        
        // --- Batch Write ---
        const quizId = 'java-multithreading-expert-quiz';

        // Add questions to batch
        const questionsRef = collection(db, 'questions');
        questions.forEach((questionData, index) => {
            const questionId = questionIds[index];
            const questionDoc = doc(questionsRef, questionId);
            batch.set(questionDoc, questionData);
        });

        // Add quiz to batch
        const quizzesRef = collection(db, 'quizzes');
        const quizDoc = doc(quizzesRef, quizId);
        batch.set(quizDoc, quiz);

        await batch.commit();

        revalidatePath('/admin/quizzes');
        return { success: true, message: `Successfully seeded the Java Multithreading quiz.` };

    } catch (error: any) {
        console.error("Quiz seeding failed:", error);
        return { success: false, message: error.message || "An unexpected error occurred during quiz seeding." };
    }
}

    

    