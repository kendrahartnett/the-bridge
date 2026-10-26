import { NotFoundView } from "@/components/not-found-view"

// The branded 404 page (see NotFoundView), for app/[lang]/[...missing] and for any page whose
// own check calls notFound().
export default function NotFound() {
  return <NotFoundView />
}
