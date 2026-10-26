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
import { NEW_REQUEST_FORM as F } from "@/lib/copy"
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/labels"
import { COMMUNITY_AREAS, neighborhoodLabel } from "@/lib/neighborhoods"
import {
  newRequestSchema,
  type NewRequestInput,
  type NewRequestOutput,
} from "@/lib/validation"

import { createRequestAction } from "./actions"

// The form's two groups: a titled, solid section each, with consistent spacing.
function FormSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
      <h2 id={id} className="font-heading text-h3 font-bold">
        {title}
      </h2>
      {children}
    </section>
  )
}

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
      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-6" noValidate>
        <FormSection id="section-what" title={F.sections.what}>
          <FormField
            control={form.control}
            name="peopleCount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{F.peopleCount}</FormLabel>
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
                <FormLabel>{F.category}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={F.categoryPlaceholder} />
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
                <FormLabel>{F.items}</FormLabel>
                <FormControl>
                  <Input placeholder={F.itemsPlaceholder} maxLength={200} {...field} />
                </FormControl>
                <FormDescription>{F.itemsHelp}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dietaryNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{F.notes}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    maxLength={300}
                    placeholder={F.notesPlaceholder}
                    {...field}
                  />
                </FormControl>
                <FormDescription>{F.notesHelp.replace("{n}", String(notesLength))}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </FormSection>

        <FormSection id="section-where-when" title={F.sections.whereWhen}>
          <FormField
            control={form.control}
            name="neighborhood"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{F.neighborhood}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={F.neighborhoodPlaceholder} />
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
            <legend className="mb-2 text-sm font-medium">{F.window}</legend>
            <FormField
              control={form.control}
              name="windowStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{F.windowStart}</FormLabel>
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
                  <FormLabel>{F.windowEnd}</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </fieldset>
        </FormSection>

        {/* The primary action at the end of the form (not sticky): full width on phones. */}
        <Button type="submit" size="lg" loading={isPending} className="w-full sm:w-auto sm:self-end sm:px-8">
          {isPending ? F.pending : F.submit}
        </Button>
      </form>
    </Form>
  )
}
