import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './footer/footer/footer.component';
import { HeaderComponent } from './header/header-component/header-component.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  template: `<app-header></app-header>
    <router-outlet></router-outlet>
    <app-footer></app-footer>`,
})
export class AppComponent {
  title = 'tim-do-lele-food';
}
