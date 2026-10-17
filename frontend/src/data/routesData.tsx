import { IoHomeOutline } from 'react-icons/io5'
import { LuDumbbell } from 'react-icons/lu'
// import { RiUserCommunityLine } from 'react-icons/ri'
import { AiOutlineLogin } from 'react-icons/ai'
import { IoPersonOutline } from 'react-icons/io5'

interface routeData {
  id: string
  href: string
  icon: React.ReactNode
  params: object
}

export const LOGGED_IN_ROUTES: routeData[] = [
  {
    id: 'Home',
    href: '/home',
    icon: <IoHomeOutline />,
    params: {}
  },
  {
    id: 'Training',
    href: '/training',
    icon: <LuDumbbell />,
    params: {}
  },
  {
    id: 'Profile',
    href: '/profile',
    icon: <IoPersonOutline />,
    params: {}
  }
  // Hidden until the community feature is fleshed out
  // {
  //   id: 'Community',
  //   href: '/community',
  //   icon: <RiUserCommunityLine />,
  //   params: {}
  // }
]
export const LOGGED_OUT_ROUTES = [
  {
    id: 'Home',
    href: '/',
    icon: <IoHomeOutline />,
    params: {}
  },
  {
    id: 'Login',
    href: '/login',
    icon: <AiOutlineLogin />,
    params: {}
  }
]
