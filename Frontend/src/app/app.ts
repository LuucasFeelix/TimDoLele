import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AvisoPopupComponent } from './shared/aviso-popup/aviso-popup.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AvisoPopupComponent],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
  protected readonly title = signal('TimDoLele');
}
