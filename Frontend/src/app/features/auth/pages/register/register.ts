import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  // Debe ser público porque register.html lo utiliza.
  readonly router = inject(Router);

  readonly registerForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  isLoading = false;
  errorMessage = '';

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const request = this.registerForm.getRawValue();

    this.authService.register(request).subscribe({
      next: (response) => {
        console.log('Registro exitoso:', response);

        this.isLoading = false;

        this.router.navigate(['/tasks']);
      },

      error: (error) => {
        console.error('Error de registro:', error);

        if (error.status === 409) {
          this.errorMessage =
            'El correo electrónico ya está registrado.';
        } else if (error.status === 400) {
          this.errorMessage =
            'Los datos ingresados no son válidos.';
        } else {
          this.errorMessage =
            'No fue posible crear la cuenta. Inténtalo nuevamente.';
        }

        this.isLoading = false;
      },
    });
  }
}