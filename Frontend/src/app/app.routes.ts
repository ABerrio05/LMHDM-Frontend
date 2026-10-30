import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'tasks',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/tasks/pages/task-list/task-list').then(
        (m) => m.TaskListComponent
      ),
  },
  {
    path: 'spaces',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/collaboration/pages/space-list/space-list').then(
        (m) => m.SpaceListComponent
      ),
  },
  {
    path: 'planning',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/planning/pages/planning/planning').then(
        (m) => m.PlanningComponent
      ),
  },
  {
    path: 'notes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/notes/pages/note-list/note-list').then(
        (m) => m.NoteListComponent
      ),
  },
  {
    path: 'activity',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/audit/pages/activity-list/activity-list').then(
        (m) => m.ActivityListComponent
      ),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: 'login',
  },
];
