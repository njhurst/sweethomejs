import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.image.BufferedImage;
import java.io.File;
import java.util.List;

import javax.imageio.ImageIO;

import com.eteks.sweethome3d.io.DefaultUserPreferences;
import com.eteks.sweethome3d.model.Home;
import com.eteks.sweethome3d.model.UserPreferences;
import com.eteks.sweethome3d.swing.PlanComponent;
import com.eteks.sweethome3d.swing.SwingViewFactory;

/**
 * Renders the plan of a home to a PNG at a fixed scale, like the web plan
 * view (used as a golden reference by the render2d parity tests).
 */
public class PlanImageDump {
  public static void main(String[] args) throws Exception {
    if (args.length < 2) {
      System.err.println("Usage: PlanImageDump <home.sh3d> <out.png> [scale]");
      System.exit(1);
    }
    float scale = args.length > 2 ? Float.parseFloat(args[2]) : 0.5f;
    Home home = new com.eteks.sweethome3d.io.HomeFileRecorder().readHome(args[0]);
    UserPreferences preferences = new DefaultUserPreferences(true);

    // Force the top camera so the plan shows all levels' content at the base level
    home.setCamera(home.getTopCamera());
    home.setSelectedLevel(null);

    PlanComponent planComponent = new PlanComponent(home, preferences, null);
    planComponent.setScale(scale);
    planComponent.setBackground(Color.WHITE);
    planComponent.setForeground(Color.BLACK);

    // Size the component to the plan bounds + margin (PlanComponent uses a 40 unit margin)
    Rectangle bounds = planComponent.getPlanBounds() != null
        ? new Rectangle((int)planComponent.getPlanBounds().getMinX() - 40,
                        (int)planComponent.getPlanBounds().getMinY() - 40,
                        (int)planComponent.getPlanBounds().getWidth() + 80,
                        (int)planComponent.getPlanBounds().getHeight() + 80)
        : new Rectangle(0, 0, 1000, 1000);
    int width = (int)(bounds.width * scale);
    int height = (int)(bounds.height * scale);
    planComponent.setSize(width, height);

    BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
    Graphics2D g2D = (Graphics2D)image.getGraphics();
    g2D.setColor(Color.WHITE);
    g2D.fillRect(0, 0, width, height);
    planComponent.printAll(g2D);
    g2D.dispose();

    ImageIO.write(image, "png", new File(args[1]));
    System.out.println("Wrote plan PNG " + width + "x" + height + " at scale " + scale);
  }
}
