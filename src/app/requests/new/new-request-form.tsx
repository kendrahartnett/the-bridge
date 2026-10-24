"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/labels"
import { COMMUNITY_AREAS, neighborhoodLabel } from "@/lib/neighborhoods"
import {
  newRequestSchema,
  type NewRequestInput,
  type NewRequestOutput,
} from "@/lib/validation"

import { createRequestAction } from "./actions"

export function NewRequestForm() {
  const [isPending, startTransition] = useTransition()
  const form = useForm<NewRequestInput, unknown, NewRequestOutput>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: {
      peopleCount: "",
      category: undefined,
      items: "",
      dietaryNotes: "",
      neighborhood: undefined,
      windowStart: "",
      windowEnd: "",
    },
  })

  function onSubmit() {
    // Send the raw form strings; the server parses them with the same schema.
    const values = form.getValues()
    startTransition(async () => {
      const result = await createRequestAction(values)
      // A successful save redirects, so we only get here on failure.
      if (result?.fieldErrors) {
        for (const [name, messages] of Object.entries(result.fieldErrors)) {
          form.setError(name as keyof NewRequestInput, { message: messages?.[0] })
        }
      }
      if (result?.error) toast.error(result.error)
    })
  }

  const notesLength = useWatch({ control: form.control, name: "dietaryNotes" })?.length ?? 0

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-7" noValidate>
        <FormField
          control={form.control}
          name="peopleCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>How many people?</FormLabel>
              <FormControl>
                <Input type="number" inputMode="numeric" min={1} max={500} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type of support</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="items"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What&apos;s needed</FormLabel>
              <FormControl>
                <Input placeholder="Example: 10 winter coats, sizes M–XL" maxLength={200} {...field} />
              </FormControl>
              <FormDescription>
                Describe the items needed, not the people. Don&apos;t include names, health details, or exact locations.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dietaryNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  maxLength={300}
                  placeholder="Example: sizes, dietary needs, or quantities per person"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {notesLength}/300. No names or other personal details.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="neighborhood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Neighborhood</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? ""}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a neighborhood" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-80">
                  {COMMUNITY_AREAS.map((area) => (
                    <SelectItem key={area} value={area}>
                      {neighborhoodLabel(area)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-medium">When can you receive it? (Chicago time)</legend>
          <FormField
            control={form.control}
            name="windowStart"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="windowEnd"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Until</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </fieldset>

        <Button type="submit" size="lg" disabled={isPending}>
          {isPending ? "Sending…" : "Send request"}
        </Button>
      </form>
    </Form>
  )
}
