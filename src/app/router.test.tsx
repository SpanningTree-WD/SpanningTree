import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { PublicLayout } from '../components/layout/PublicLayout'
import { ActivitiesPage } from '../features/activities/ActivitiesPage'
it('renders a directly addressed archive route and active navigation',()=>{const router=createMemoryRouter([{element:<PublicLayout/>,children:[{path:'/activities',element:<ActivitiesPage/>}]}],{initialEntries:['/activities']});render(<RouterProvider router={router}/>);expect(screen.getByRole('heading',{name:'Activities'})).toBeInTheDocument();expect(screen.getByRole('link',{name:'Activities'})).toHaveClass('active');expect(screen.getAllByRole('article')).toHaveLength(5)})
