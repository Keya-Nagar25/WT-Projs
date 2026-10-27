import type { Access, CollectionConfig } from 'payload'

const isSelf: Access = ({ req }) => {
  if (req.user?.collection !== 'users') return false
  return { id: { equals: req.user.id } }
}

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    hidden: true,
    useAsTitle: 'email',
  },
  access: {
    create: () => true,
    read: isSelf,
    update: isSelf,
    delete: isSelf,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
  ],
  versions: false,
}
